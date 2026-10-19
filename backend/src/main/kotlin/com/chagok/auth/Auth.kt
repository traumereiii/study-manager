package com.chagok.auth

import com.chagok.common.unauthorized
import com.chagok.study.newId
import com.nimbusds.jose.jwk.source.ImmutableSecret
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.LockModeType
import jakarta.persistence.Table
import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.OAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import javax.crypto.spec.SecretKeySpec

@ConfigurationProperties("app.jwt")
data class JwtProperties(val secret: String, val issuer: String = "chagok")

@Entity
@Table(name = "refresh_sessions")
class RefreshSession(
    @Id @Column(length = 36) var id: String = newId(),
    @Column(length = 64, nullable = false) var tokenHash: String = "",
    @Column(nullable = false) var expiresAt: Instant = Instant.EPOCH,
    @Column(nullable = false) var revoked: Boolean = false,
    @Column(nullable = false) var createdAt: Instant = Instant.EPOCH,
)

interface RefreshSessionRepository : JpaRepository<RefreshSession, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from RefreshSession s where s.id = :id")
    fun lockById(id: String): RefreshSession?
}

data class LoginInput(val username: String, val password: String)
data class RefreshInput(val refreshToken: String)
data class TokenPair(
    val accessToken: String, val refreshToken: String,
    val tokenType: String = "Bearer", val expiresIn: Long = 7200,
    val accessExpiresAt: Instant, val refreshExpiresAt: Instant,
)

fun sha256(value: String): String = MessageDigest.getInstance("SHA-256")
    .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

@Service
class JwtTokens(private val properties: JwtProperties, private val clock: Clock, private val sessions: RefreshSessionRepository) {
    private val key = SecretKeySpec(properties.secret.toByteArray(Charsets.UTF_8).also {
        require(it.size >= 32) { "JWT_SECRET must contain at least 32 UTF-8 bytes" }
    }, "HmacSHA256")
    private val encoder = NimbusJwtEncoder(ImmutableSecret(key))

    private fun baseValidator(): OAuth2TokenValidator<Jwt> = DelegatingOAuth2TokenValidator(
        JwtTimestampValidator(Duration.ZERO).apply { setClock(clock) },
        JwtIssuerValidator(properties.issuer),
        OAuth2TokenValidator { jwt ->
            val issuedAt = jwt.issuedAt
            val expiry = jwt.expiresAt
            if (jwt.subject == "admin" && expiry != null && issuedAt != null &&
                issuedAt <= clock.instant() && expiry.isAfter(clock.instant()) &&
                jwt.id != null && jwt.getClaimAsString("sid") != null) {
                OAuth2TokenValidatorResult.success()
            } else invalidToken()
        },
    )

    private val refreshDecoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build().apply {
        setJwtValidator(baseValidator())
    }

    fun accessDecoder(): JwtDecoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build().apply {
        setJwtValidator(DelegatingOAuth2TokenValidator(baseValidator(), OAuth2TokenValidator { jwt ->
            val session = jwt.getClaimAsString("sid")?.let { sessions.findById(it).orElse(null) }
            if (jwt.getClaimAsString("token_type") == "access" && session != null && !session.revoked) {
                OAuth2TokenValidatorResult.success()
            } else invalidToken()
        }))
    }

    fun decodeRefresh(token: String): Jwt {
        val jwt = try { refreshDecoder.decode(token) } catch (_: JwtException) { unauthorized("RefreshToken이 유효하지 않거나 만료되었습니다.") }
        if (jwt.getClaimAsString("token_type") != "refresh") unauthorized()
        return jwt
    }

    fun pair(session: RefreshSession): TokenPair {
        val now = clock.instant()
        val accessExpiry = now.plus(Duration.ofHours(2))
        return TokenPair(
            accessToken = encode("access", session.id, now, accessExpiry),
            refreshToken = encode("refresh", session.id, now, session.expiresAt),
            accessExpiresAt = accessExpiry, refreshExpiresAt = session.expiresAt,
        )
    }

    private fun encode(type: String, sid: String, now: Instant, expiry: Instant): String {
        val claims = JwtClaimsSet.builder().issuer(properties.issuer).subject("admin").id(newId())
            .issuedAt(now).expiresAt(expiry).claim("sid", sid).claim("token_type", type).build()
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).tokenValue
    }

    private fun invalidToken() = OAuth2TokenValidatorResult.failure(OAuth2Error("invalid_token", "Invalid token", null))
}

@Service
@Transactional
class AuthService(private val sessions: RefreshSessionRepository, private val tokens: JwtTokens, private val clock: Clock) {
    private val passwords = BCryptPasswordEncoder()
    private val adminPassword = passwords.encode("admin1234")

    fun login(input: LoginInput): TokenPair {
        // 사용자명이 틀린 경우에도 같은 비밀번호 검증 비용을 사용한다.
        val validPassword = input.password.toByteArray(Charsets.UTF_8).size <= 72 && passwords.matches(input.password, adminPassword)
        if (input.username != "admin" || !validPassword) unauthorized("아이디 또는 비밀번호가 올바르지 않습니다.")
        val now = clock.instant()
        val session = RefreshSession(createdAt = now, expiresAt = now.atZone(ZoneOffset.UTC).plusMonths(1).toInstant())
        val pair = tokens.pair(session)
        session.tokenHash = sha256(pair.refreshToken)
        sessions.save(session)
        return pair
    }

    fun refresh(input: RefreshInput): TokenPair {
        if (input.refreshToken.length > 4096) unauthorized()
        val jwt = tokens.decodeRefresh(input.refreshToken)
        val session = sessions.lockById(jwt.getClaimAsString("sid") ?: unauthorized()) ?: unauthorized()
        if (session.revoked || !session.expiresAt.isAfter(clock.instant()) ||
            !MessageDigest.isEqual(session.tokenHash.toByteArray(), sha256(input.refreshToken).toByteArray())) unauthorized()
        val pair = tokens.pair(session)
        session.tokenHash = sha256(pair.refreshToken)
        return pair
    }

    fun logout(sessionId: String) {
        sessions.lockById(sessionId)?.revoked = true
    }
}
