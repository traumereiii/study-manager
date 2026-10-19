package com.chagok

import com.chagok.auth.*
import com.chagok.study.*
import com.nimbusds.jwt.SignedJWT
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.mysql.MySQLContainer
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import java.util.Base64
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import javax.imageio.ImageIO

class MutableClock : Clock() {
    @Volatile var current: Instant = Instant.parse("2026-01-31T14:59:00Z")
    override fun instant(): Instant = current
    override fun getZone(): ZoneId = ZoneOffset.UTC
    override fun withZone(zone: ZoneId): Clock = Clock.fixed(current, zone)
}

@TestConfiguration
class ClockConfiguration {
    @Bean @Primary fun testClock() = MutableClock()
}

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@Import(ClockConfiguration::class)
@Testcontainers
class BackendIntegrationTest {
    companion object {
        @Container @JvmField
        val mysql = MySQLContainer("mysql:8.0.46")
            .withDatabaseName("chagok_test").withUsername("test").withPassword("test")
            .withCommand("--max-allowed-packet=64M", "--log-bin-trust-function-creators=1")

        @DynamicPropertySource @JvmStatic
        fun database(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", mysql::getJdbcUrl)
            registry.add("spring.datasource.username", mysql::getUsername)
            registry.add("spring.datasource.password", mysql::getPassword)
            registry.add("app.jwt.secret") { "integration-test-only-secret-at-least-32-bytes-long" }
        }
    }

    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var mapper: ObjectMapper
    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var clock: MutableClock
    @Autowired lateinit var study: StudyService
    @Autowired lateinit var auth: AuthService

    @BeforeEach
    fun resetIsolatedTestDatabase() {
        check(mysql.databaseName == "chagok_test")
        jdbc.update("DELETE FROM books")
        jdbc.update("DELETE FROM refresh_sessions")
        jdbc.update("UPDATE study_settings SET shortcuts=1, reveal_key='Space', unknown_key='1', known_key='2', alarm=0, alarm_time='20:00', time_limit=0, alarm_last_date=NULL WHERE id=1")
        clock.current = Instant.parse("2026-01-31T14:59:00Z")
    }

    private fun call(method: String, path: String, body: Any? = null, token: String? = null, expected: Int = 200, key: String? = null): JsonNode {
        val builder = request(HttpMethod.valueOf(method), "/api/v1$path")
        if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(if (body is String) body else mapper.writeValueAsString(body))
        if (token != null) builder.header("Authorization", "Bearer $token")
        if (key != null) builder.header("Idempotency-Key", key)
        val response = mvc.perform(builder).andExpect(status().`is`(expected)).andReturn().response
        return if (response.contentAsString.isEmpty()) mapper.createObjectNode() else mapper.readTree(response.contentAsByteArray)
    }

    private fun login(): JsonNode = call("POST", "/auth/login", LoginInput("admin", "admin1234"))
    private fun token(): String = login()["accessToken"].asString()
    private fun fixture(): Pair<BookDto, CardDto> {
        val b = study.createBook(BookInput("스프링", "학습", "⌘", "개념"))
        return b to study.createCard(b.id, CardInput("qa", "JPA란?", "ORM")).card
    }

    @Test
    fun `login issues two hour access and one calendar month refresh tokens`() {
        val result = login()
        val access = SignedJWT.parse(result["accessToken"].asString()).jwtClaimsSet
        val refresh = SignedJWT.parse(result["refreshToken"].asString()).jwtClaimsSet
        assertThat(Duration.between(access.issueTime.toInstant(), access.expirationTime.toInstant())).isEqualTo(Duration.ofHours(2))
        assertThat(refresh.expirationTime.toInstant()).isEqualTo(Instant.parse("2026-02-28T14:59:00Z"))
        assertThat(access.getStringClaim("token_type")).isEqualTo("access")
        assertThat(refresh.getStringClaim("token_type")).isEqualTo("refresh")
        assertThat(result["expiresIn"].asLong()).isEqualTo(7200)
        call("GET", "/auth/me", token = result["accessToken"].asString())
        assertThat(jdbc.queryForObject("SELECT token_hash FROM refresh_sessions", String::class.java)).isEqualTo(sha256(result["refreshToken"].asString()))
    }

    @Test
    fun `authentication rejects bad credentials missing tampered and refresh bearer tokens`() {
        call("POST", "/auth/login", LoginInput("admin", "wrong"), expected = 401)
        call("POST", "/auth/login", LoginInput("someone", "admin1234"), expected = 401)
        call("GET", "/bootstrap", expected = 401)
        val result = login()
        call("GET", "/bootstrap", token = result["refreshToken"].asString(), expected = 401)
        val access = result["accessToken"].asString()
        val pieces = access.split('.').toMutableList()
        pieces[1] = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"sub\":\"admin\"}".toByteArray())
        call("GET", "/bootstrap", token = pieces.joinToString("."), expected = 401)
        call("POST", "/auth/refresh", RefreshInput(access), expected = 401)
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM refresh_sessions", Int::class.java)).isEqualTo(1)
    }

    @Test
    fun `refresh rotates once and logout revokes all tokens of that session`() {
        val first = login()
        val second = call("POST", "/auth/refresh", RefreshInput(first["refreshToken"].asString()))
        assertThat(second["refreshToken"].asString()).isNotEqualTo(first["refreshToken"].asString())
        assertThat(second["refreshExpiresAt"]).isEqualTo(first["refreshExpiresAt"])
        call("POST", "/auth/refresh", RefreshInput(first["refreshToken"].asString()), expected = 401)
        call("GET", "/bootstrap", token = second["accessToken"].asString())
        call("POST", "/auth/logout", token = second["accessToken"].asString(), expected = 204)
        call("GET", "/bootstrap", token = second["accessToken"].asString(), expected = 401)
        call("GET", "/bootstrap", token = first["accessToken"].asString(), expected = 401)
        call("POST", "/auth/refresh", RefreshInput(second["refreshToken"].asString()), expected = 401)
    }

    @Test
    fun `expiration is enforced and expired access can be refreshed`() {
        val first = login()
        clock.current = clock.current.plus(Duration.ofHours(2))
        call("GET", "/bootstrap", token = first["accessToken"].asString(), expected = 401)
        val second = call("POST", "/auth/refresh", RefreshInput(first["refreshToken"].asString()))
        call("GET", "/bootstrap", token = second["accessToken"].asString())
        clock.current = Instant.parse("2026-02-28T14:59:00Z")
        call("POST", "/auth/refresh", RefreshInput(second["refreshToken"].asString()), expected = 401)
    }

    @Test
    fun `concurrent refresh only succeeds once`() {
        val pair = auth.login(LoginInput("admin", "admin1234"))
        val pool = Executors.newFixedThreadPool(2)
        try {
            val results = pool.invokeAll(List(2) { Callable { runCatching { auth.refresh(RefreshInput(pair.refreshToken)) }.isSuccess } }).map { it.get() }
            assertThat(results.count { it }).isEqualTo(1)
        } finally { pool.shutdownNow() }
    }

    @Test
    fun `empty bootstrap and book lifecycle preserve archive state`() {
        val access = token()
        val initial = call("GET", "/bootstrap", token = access)
        assertThat(initial["books"].size()).isZero()
        assertThat(initial["history"].size()).isZero()
        assertThat(initial["settings"]["timeLimit"].asInt()).isZero()
        val book = call("POST", "/books", BookInput("  제목  ", " 소개 "), access, 201)
        val id = book["id"].asString()
        assertThat(book["name"].asString()).isEqualTo("제목")
        call("POST", "/books/$id/completion", token = access, expected = 400)
        call("DELETE", "/books/$id", token = access, expected = 409)
        call("PATCH", "/books/$id/state", BookStateInput(archived = true), access)
        call("POST", "/books/$id/cards", CardInput("qa", "Q", "A"), access, 409)
        call("PATCH", "/books/$id/state", BookStateInput(deleted = true), access)
        val restored = call("PATCH", "/books/$id/state", BookStateInput(deleted = false), access)
        assertThat(restored["archived"].asBoolean()).isTrue()
        call("PUT", "/books/$id", BookInput("수정"), access)
        assertThat(call("GET", "/bootstrap", token = access)["books"][0]["name"].asString()).isEqualTo("수정")
    }

    @Test
    fun `API rejects unknown fields invalid types missing headers and invalid settings`() {
        val access = token()
        call("POST", "/books", """{"name":"book","level":5}""", access, 400)
        call("POST", "/books", BookInput(" "), access, 400)
        call("POST", "/books", BookInput("a".repeat(61)), access, 400)
        call("PUT", "/settings", SettingsInput(known = "1"), access, 400)
        call("PUT", "/settings", SettingsInput(timeLimit = 601), access, 400)
        call("PUT", "/settings", """{"timeLimit":1.5}""", access, 400)
        call("PUT", "/settings", """{"timeLimit":"1"}""", access, 400)
        call("PUT", "/settings", SettingsInput(alarmTime = "25:00"), access, 400)
        call("POST", "/evaluations", EvaluationInput("x", "y", true, 1), access, 400)
        call("GET", "/unknown", token = access, expected = 404)
    }

    @Test
    fun `choice and blank validation and type changes follow frontend contract`() {
        val access = token()
        val b = study.createBook(BookInput("유형"))
        call("POST", "/books/${b.id}/cards", CardInput("blank", "빈칸 없음", "A"), access, 400)
        call("POST", "/books/${b.id}/cards", CardInput("choice", "Q", options = listOf("a", "a", "c", "d"), correct = 1), access, 400)
        call("POST", "/books/${b.id}/cards", CardInput("choice", "Q", options = listOf("a", "b", "c", "d"), correct = 4), access, 400)
        val c = call("POST", "/books/${b.id}/cards", CardInput("choice", "Q", answer = "forged", options = listOf("a", "b", "c", "d"), correct = 2), access, 201)["card"]
        assertThat(c["answer"].asString()).isEqualTo("c")
        val edited = call("PUT", "/cards/${c["id"].asString()}", CardInput("blank", "TCP __", "연결"), access)["card"]
        assertThat(edited["options"].isNull).isTrue()
        assertThat(edited["correct"].isNull).isTrue()
        assertThat(edited["level"].asInt()).isEqualTo(1)
    }

    @Test
    fun `evaluation is atomic idempotent and respects level limits`() {
        val (b, c) = fixture()
        val access = token()
        val key = UUID.randomUUID().toString()
        val input = EvaluationInput(b.id, c.id, true, 12000, 8000)
        val first = call("POST", "/evaluations", input, access, key = key)
        val replay = call("POST", "/evaluations", input, access, key = key)
        assertThat(replay).isEqualTo(first)
        assertThat(first["card"]["level"].asInt()).isEqualTo(2)
        call("POST", "/evaluations", input.copy(known = false), access, 409, key)
        repeat(5) { study.evaluate(newId(), input) }
        val snapshot = study.bootstrap()
        assertThat(snapshot.cards.single().level).isEqualTo(5)
        assertThat(snapshot.history.size).isEqualTo(6)
        assertThat(snapshot.history.first().durationMs).isEqualTo(12000)
        assertThat(snapshot.history.first().revealMs).isEqualTo(8000)
        repeat(8) { study.evaluate(newId(), input.copy(known = false)) }
        assertThat(study.bootstrap().cards.single().level).isEqualTo(1)
    }

    @Test
    fun `concurrent same key writes once and distinct evaluations accumulate`() {
        val (b, c) = fixture()
        val input = EvaluationInput(b.id, c.id, true, 10, 5)
        val key = newId()
        val pool = Executors.newFixedThreadPool(2)
        try {
            val first = pool.invokeAll(List(2) { Callable { study.evaluate(key, input) } }).map { it.get() }
            assertThat(first[0]).isEqualTo(first[1])
            assertThat(study.bootstrap().history).hasSize(1)
            pool.invokeAll(List(2) { Callable { study.evaluate(newId(), input) } }).forEach { it.get() }
            assertThat(study.bootstrap().history).hasSize(3)
            assertThat(study.bootstrap().cards.single().level).isEqualTo(4)
        } finally { pool.shutdownNow() }
    }

    @Test
    fun `database failure rolls back evaluation level history and request key`() {
        val (b, c) = fixture()
        val input = EvaluationInput(b.id, c.id, true, 10, 5)
        jdbc.execute("CREATE TRIGGER fail_request BEFORE INSERT ON evaluation_requests FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test failure'")
        try {
            assertThatThrownBy { study.evaluate(newId(), input) }.isInstanceOf(Exception::class.java)
            assertThat(study.bootstrap().cards.single().level).isEqualTo(1)
            assertThat(study.bootstrap().history).isEmpty()
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM evaluation_requests", Int::class.java)).isZero()
        } finally { jdbc.execute("DROP TRIGGER fail_request") }
    }

    @Test
    fun `card deletion preserves history purge removes history and idempotency records`() {
        val (b, c) = fixture()
        val key = newId()
        val input = EvaluationInput(b.id, c.id, true, 10, 5)
        val evaluation = study.evaluate(key, input)
        study.completeBook(b.id)
        study.updateCard(c.id, CardInput("qa", "수정", "답"))
        assertThat(study.bootstrap().books.single().completed).isNull()
        assertThat(study.bootstrap().cards.single().level).isEqualTo(2)
        study.resetCardLevel(c.id)
        assertThat(study.bootstrap().history).hasSize(1)
        study.deleteCard(c.id)
        assertThat(study.bootstrap().cards).isEmpty()
        assertThat(study.bootstrap().history.single().cardId).isEqualTo(c.id)
        assertThat(jdbc.queryForObject("SELECT card_id FROM evaluations", String::class.java)).isNull()
        assertThat(study.evaluate(key, input)).isEqualTo(evaluation)
        study.setBookState(b.id, BookStateInput(deleted = true))
        study.purgeBook(b.id)
        assertThat(study.bootstrap().books).isEmpty()
        assertThat(study.bootstrap().history).isEmpty()
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM evaluation_requests", Int::class.java)).isZero()
    }

    @Test
    fun `mismatched book invalid timing and archived evaluations make no changes`() {
        val (b, c) = fixture()
        val other = study.createBook(BookInput("다른 문제집"))
        val access = token()
        call("POST", "/evaluations", EvaluationInput(other.id, c.id, true, 10), access, 400, newId())
        call("POST", "/evaluations", EvaluationInput(b.id, c.id, true, 10, 11), access, 400, newId())
        call("POST", "/evaluations", EvaluationInput(b.id, c.id, true, -1), access, 400, newId())
        call("POST", "/evaluations", """{"bookId":"${b.id}","cardId":"${c.id}","durationMs":1}""", access, 400, newId())
        study.setBookState(b.id, BookStateInput(archived = true))
        call("POST", "/evaluations", EvaluationInput(b.id, c.id, true, 10), access, 409, newId())
        assertThat(study.bootstrap().history).isEmpty()
        assertThat(study.bootstrap().cards.single().level).isEqualTo(1)
    }

    @Test
    fun `seoul midnight controls study date and completion and settings persist`() {
        val (b, c) = fixture()
        val first = study.evaluate(newId(), EvaluationInput(b.id, c.id, true, 10))
        assertThat(first.entry.date.toString()).isEqualTo("2026-01-31")
        clock.current = Instant.parse("2026-01-31T15:01:00Z")
        val second = study.evaluate(newId(), EvaluationInput(b.id, c.id, true, 10))
        assertThat(second.entry.date.toString()).isEqualTo("2026-02-01")
        assertThat(study.completeBook(b.id).completed.toString()).isEqualTo("2026-02-01")
        study.saveSettings(SettingsInput(alarm = true, timeLimit = 600))
        study.setAlarmDate(java.time.LocalDate.parse("2026-02-01"))
        study.setAlarmDate(java.time.LocalDate.parse("2026-01-31"))
        val loaded = study.bootstrap()
        assertThat(loaded.settings.timeLimit).isEqualTo(600)
        assertThat(loaded.settings.alarm).isTrue()
        assertThat(loaded.alarmLastDate).isEqualTo("2026-02-01")
    }

    private fun png(): String {
        val output = ByteArrayOutputStream()
        ImageIO.write(BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", output)
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(output.toByteArray())
    }

    @Test
    fun `images roundtrip prune unreferenced assets and reject broken missing spoofed or oversized data`() {
        val access = token()
        val book = study.createBook(BookInput("이미지"))
        val image = png()
        val input = CardInput("qa", "![사진](asset:img-test)", "답", assets = mapOf("img-test" to image, "img-unused" to image))
        val result = call("POST", "/books/${book.id}/cards", input, access, 201)
        assertThat(result["card"]["assets"].size()).isEqualTo(1)
        assertThat(result["card"]["assets"]["img-test"].asString()).isEqualTo(image)
        assertThat(study.bootstrap().cards.single().assets["img-test"]).isEqualTo(image)
        call("POST", "/books/${book.id}/cards", input.copy(assets = emptyMap()), access, 400)
        call("POST", "/books/${book.id}/cards", input.copy(assets = mapOf("img-test" to image.replace("image/png", "image/jpeg"))), access, 400)
        call("POST", "/books/${book.id}/cards", input.copy(assets = mapOf("img-test" to "data:image/svg+xml;base64,PHN2Zy8+")), access, 400)
        call("POST", "/books/${book.id}/cards", input.copy(assets = mapOf("img-test" to "data:image/png;base64,YWJj")), access, 400)
        val large = "data:image/png;base64," + Base64.getEncoder().encodeToString(ByteArray(2 * 1024 * 1024 + 1))
        call("POST", "/books/${book.id}/cards", input.copy(assets = mapOf("img-test" to large)), access, 400)
        study.updateCard(result["card"]["id"].asString(), CardInput("qa", "이미지 제거", "답"))
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM card_assets", Int::class.java)).isZero()
    }

    @Test
    fun `json body limit returns structured 413`() {
        val access = token()
        val result = mvc.perform(request(HttpMethod.POST, "/api/v1/books")
            .header("Authorization", "Bearer $access").contentType(MediaType.APPLICATION_JSON)
            .content(ByteArray(16 * 1024 * 1024 + 1))).andExpect(status().`is`(413)).andReturn()
        assertThat(mapper.readTree(result.response.contentAsByteArray)["code"].asString()).isEqualTo("PAYLOAD_TOO_LARGE")
    }
}
