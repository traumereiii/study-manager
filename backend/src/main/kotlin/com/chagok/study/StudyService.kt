package com.chagok.study

import com.chagok.auth.sha256
import com.chagok.common.ApiException
import com.chagok.common.conflict
import com.chagok.common.invalid
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
import tools.jackson.core.type.TypeReference
import tools.jackson.databind.ObjectMapper
import java.time.Clock
import java.time.LocalDate
import java.time.ZoneId
import java.util.Base64
import java.util.UUID

@Service
// 카드의 부모 ID를 조회한 뒤 잠금을 기다리더라도 후속 조회는 최신 커밋을 읽는다.
@Transactional(isolation = Isolation.READ_COMMITTED)
class StudyService(
    private val books: BookRepository, private val cards: CardRepository,
    private val assets: CardAssetRepository, private val history: EvaluationRepository,
    private val requests: EvaluationRequestRepository, private val settings: SettingsRepository,
    private val validation: InputValidation, private val mapper: ObjectMapper, private val clock: Clock,
) {
    private fun today(): LocalDate = LocalDate.now(clock.withZone(ZoneId.of("Asia/Seoul")))
    private fun book(id: String): BookEntity = books.lockById(id) ?: throw ApiException(HttpStatus.NOT_FOUND, "BOOK_NOT_FOUND", "문제집을 찾을 수 없습니다.")
    private fun card(id: String): CardEntity = cards.lockById(id) ?: throw ApiException(HttpStatus.NOT_FOUND, "CARD_NOT_FOUND", "문제를 찾을 수 없습니다.")
    private fun active(book: BookEntity) {
        if (book.archived || book.deleted) conflict("BOOK_NOT_ACTIVE", "보관 또는 삭제된 문제집은 먼저 복원해 주세요.")
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    fun bootstrap(): BootstrapDto {
        val allAssets = assets.findAll().groupBy { it.cardId }
        val configuration = settings.findById(1).orElseThrow()
        return BootstrapDto(
            books.findAllByOrderByCreatedAtAscIdAsc().map(::bookDto),
            cards.findAllByOrderByCreatedAtAscIdAsc().map { cardDto(it, allAssets[it.id].orEmpty()) },
            history.findAllByOrderByAtAscIdAsc().map(::historyDto), settingsDto(configuration),
            configuration.alarmLastDate?.toString() ?: "",
        )
    }

    fun createBook(input: BookInput): BookDto {
        val value = validation.book(input)
        return bookDto(books.save(BookEntity(name = value.name, description = value.desc, icon = value.icon, category = value.category, createdAt = clock.instant())))
    }

    fun updateBook(id: String, input: BookInput): BookDto {
        val value = validation.book(input)
        val book = book(id)
        book.name = value.name
        book.description = value.desc
        book.icon = value.icon
        book.category = value.category
        return bookDto(book)
    }

    fun setBookState(id: String, input: BookStateInput): BookDto {
        if (input.archived == null && input.deleted == null) invalid("변경할 상태를 지정해 주세요.")
        val book = book(id)
        input.archived?.let { book.archived = it }
        input.deleted?.let { book.deleted = it }
        return bookDto(book)
    }

    fun purgeBook(id: String) {
        val book = book(id)
        if (!book.deleted) conflict("BOOK_NOT_DELETED", "휴지통에 있는 문제집만 완전히 삭제할 수 있습니다.")
        // 자식 레코드의 삭제와 평가 카드 참조 해제는 Flyway의 FK 정책을 사용한다.
        books.delete(book)
        books.flush()
    }

    fun createCard(bookId: String, input: CardInput): CardResult {
        val value = validation.card(input)
        val book = book(bookId)
        active(book)
        val card = cards.save(CardEntity(bookId = bookId, createdAt = clock.instant()))
        applyCard(card, value.input)
        val images = replaceAssets(card.id, value.assets)
        book.completed = null
        return CardResult(cardDto(card, images), bookDto(book))
    }

    private fun lockedCard(id: String): Pair<BookEntity, CardEntity> {
        val bookId = cards.findBookId(id) ?: throw ApiException(HttpStatus.NOT_FOUND, "CARD_NOT_FOUND", "문제를 찾을 수 없습니다.")
        val book = book(bookId)
        active(book)
        return book to card(id)
    }

    fun updateCard(id: String, input: CardInput): CardResult {
        val value = validation.card(input)
        val (book, card) = lockedCard(id)
        applyCard(card, value.input)
        val images = replaceAssets(id, value.assets)
        book.completed = null
        return CardResult(cardDto(card, images), bookDto(book))
    }

    fun deleteCard(id: String) {
        val (_, card) = lockedCard(id)
        cards.delete(card)
        cards.flush()
    }

    fun resetCardLevel(id: String): CardResult {
        val (book, card) = lockedCard(id)
        card.level = 1
        book.completed = null
        return CardResult(cardDto(card), bookDto(book))
    }

    fun evaluate(keyInput: String, input: EvaluationInput): EvaluationResult {
        validation.evaluation(input)
        if (keyInput.length != 36) invalid("Idempotency-Key는 UUID여야 합니다.")
        val key = try { UUID.fromString(keyInput).toString() } catch (_: IllegalArgumentException) { invalid("Idempotency-Key는 UUID여야 합니다.") }
        val book = book(input.bookId)
        val hash = sha256(mapper.writeValueAsString(input))
        requests.findById(key).orElse(null)?.let {
            if (it.requestHash != hash) conflict("IDEMPOTENCY_CONFLICT", "같은 요청 키를 다른 평가에 사용할 수 없습니다.")
            return mapper.readValue(it.responseJson, EvaluationResult::class.java)
        }
        active(book)
        val card = card(input.cardId)
        if (card.bookId != book.id) invalid("문제집과 문제의 소속이 일치하지 않습니다.")
        card.level = (card.level + if (input.known) 1 else -1).coerceIn(1, 5)
        val now = clock.instant()
        val date = now.atZone(ZoneId.of("Asia/Seoul")).toLocalDate()
        val entry = history.save(EvaluationEntity(bookId = book.id, cardId = card.id, originalCardId = card.id,
            date = date, at = now, known = input.known, durationMs = input.durationMs, revealMs = input.revealMs, levelAfter = card.level))
        book.lastStudy = date
        val result = EvaluationResult(cardDto(card), historyDto(entry), bookDto(book))
        requests.saveAndFlush(EvaluationRequestEntity(key, book.id, hash, mapper.writeValueAsString(result)))
        return result
    }

    fun completeBook(id: String): BookDto {
        val book = book(id)
        active(book)
        if (cards.countByBookId(id) == 0L) invalid("빈 문제집은 학습 완료할 수 없습니다.")
        book.completed = today()
        return bookDto(book)
    }

    fun saveSettings(input: SettingsInput): SettingsInput {
        val value = validation.settings(input)
        val current = settings.lockSettings()
        current.shortcuts = value.shortcuts
        current.reveal = value.reveal
        current.unknown = value.unknown
        current.known = value.known
        current.alarm = value.alarm
        current.alarmTime = value.alarmTime
        current.timeLimit = value.timeLimit
        return settingsDto(current)
    }

    fun setAlarmDate(date: LocalDate) {
        if (date.isAfter(today())) invalid("미래의 알림 날짜는 저장할 수 없습니다.")
        val current = settings.lockSettings()
        if (current.alarmLastDate == null || date.isAfter(current.alarmLastDate)) current.alarmLastDate = date
    }

    private fun applyCard(card: CardEntity, input: CardInput) {
        card.type = input.type
        card.question = input.question
        card.answer = input.answer
        card.explanation = input.explanation
        card.optionsJson = input.options?.let(mapper::writeValueAsString)
        card.correct = input.correct
    }

    private fun replaceAssets(cardId: String, images: List<ValidatedAsset>): List<CardAssetEntity> {
        assets.removeByCardId(cardId)
        return assets.saveAll(images.map { CardAssetEntity(cardId = cardId, assetId = it.id, mime = it.mime, content = it.content) })
    }

    private fun bookDto(b: BookEntity) = BookDto(b.id, b.name, b.description, b.icon, b.category, b.color, b.ink, b.archived, b.deleted, b.lastStudy, b.completed)
    private fun cardDto(c: CardEntity, images: List<CardAssetEntity> = assets.findAllByCardId(c.id)) = CardDto(
        c.id, c.bookId, c.type, c.question, c.answer, c.explanation,
        c.optionsJson?.let { mapper.readValue(it, object : TypeReference<List<String>>() {}) }, c.correct, c.level,
        images.associate { it.assetId to "data:${it.mime};base64,${Base64.getEncoder().encodeToString(it.content)}" },
    )
    private fun historyDto(e: EvaluationEntity) = HistoryDto(e.id, e.bookId, e.originalCardId, e.date, e.at, e.known, e.durationMs, e.revealMs, e.levelAfter)
    private fun settingsDto(s: SettingsEntity) = SettingsInput(s.shortcuts, s.reveal, s.unknown, s.known, s.alarm, s.alarmTime, s.timeLimit)
}
