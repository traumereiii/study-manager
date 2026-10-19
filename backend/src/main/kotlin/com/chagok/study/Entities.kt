package com.chagok.study

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Lob
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

fun newId(): String = UUID.randomUUID().toString()

@Entity
@Table(name = "books")
class BookEntity(
    @Id @Column(length = 36) var id: String = newId(),
    @Column(length = 60, nullable = false) var name: String = "",
    @Column(name = "description", length = 160, nullable = false) var description: String = "",
    @Column(length = 8, nullable = false) var icon: String = "▤",
    @Column(length = 10, nullable = false) var category: String = "",
    @Column(length = 7, nullable = false) var color: String = "#eaf1e2",
    @Column(length = 7, nullable = false) var ink: String = "#648346",
    @Column(nullable = false) var archived: Boolean = false,
    @Column(nullable = false) var deleted: Boolean = false,
    var lastStudy: LocalDate? = null,
    var completed: LocalDate? = null,
    @Column(nullable = false) var createdAt: Instant = Instant.EPOCH,
)

@Entity
@Table(name = "cards")
class CardEntity(
    @Id @Column(length = 36) var id: String = newId(),
    @Column(length = 36, nullable = false) var bookId: String = "",
    @Column(length = 10, nullable = false) var type: String = "qa",
    @Lob @Column(columnDefinition = "longtext", nullable = false) var question: String = "",
    @Lob @Column(columnDefinition = "longtext", nullable = false) var answer: String = "",
    @Lob @Column(columnDefinition = "longtext", nullable = false) var explanation: String = "",
    @Lob @Column(columnDefinition = "longtext") var optionsJson: String? = null,
    @Column(name = "correct_index") var correct: Int? = null,
    @Column(nullable = false) var level: Int = 1,
    @Column(nullable = false) var createdAt: Instant = Instant.EPOCH,
)

@Entity
@Table(name = "card_assets")
class CardAssetEntity(
    @Id @Column(length = 36) var id: String = newId(),
    @Column(length = 36, nullable = false) var cardId: String = "",
    @Column(length = 100, nullable = false) var assetId: String = "",
    @Column(length = 30, nullable = false) var mime: String = "",
    @Lob @Column(columnDefinition = "mediumblob", nullable = false) var content: ByteArray = byteArrayOf(),
)

@Entity
@Table(name = "evaluations")
class EvaluationEntity(
    @Id @Column(length = 36) var id: String = newId(),
    @Column(length = 36, nullable = false) var bookId: String = "",
    @Column(length = 36) var cardId: String? = null,
    @Column(length = 36, nullable = false) var originalCardId: String = "",
    @Column(name = "study_date", nullable = false) var date: LocalDate = LocalDate.EPOCH,
    @Column(name = "evaluated_at", nullable = false) var at: Instant = Instant.EPOCH,
    @Column(name = "is_known", nullable = false) var known: Boolean = false,
    @Column(nullable = false) var durationMs: Long = 0,
    var revealMs: Long? = null,
    @Column(nullable = false) var levelAfter: Int = 1,
)

@Entity
@Table(name = "evaluation_requests")
class EvaluationRequestEntity(
    @Id @Column(name = "request_key", length = 36) var key: String = "",
    @Column(length = 36, nullable = false) var bookId: String = "",
    @Column(length = 64, nullable = false) var requestHash: String = "",
    @Lob @Column(columnDefinition = "longtext", nullable = false) var responseJson: String = "",
)

@Entity
@Table(name = "study_settings")
class SettingsEntity(
    @Id var id: Int = 1,
    var shortcuts: Boolean = true,
    @Column(name = "reveal_key", length = 10, nullable = false) var reveal: String = "Space",
    @Column(name = "unknown_key", length = 10, nullable = false) var unknown: String = "1",
    @Column(name = "known_key", length = 10, nullable = false) var known: String = "2",
    var alarm: Boolean = false,
    @Column(length = 5, nullable = false) var alarmTime: String = "20:00",
    var timeLimit: Int = 0,
    var alarmLastDate: LocalDate? = null,
)
