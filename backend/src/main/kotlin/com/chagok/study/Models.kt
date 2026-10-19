package com.chagok.study

import java.time.Instant
import java.time.LocalDate

data class BookInput(val name: String, val desc: String = "", val icon: String = "▤", val category: String = "")
data class BookStateInput(val archived: Boolean? = null, val deleted: Boolean? = null)
data class CardInput(
    val type: String, val question: String, val answer: String = "", val explanation: String = "",
    val options: List<String>? = null, val correct: Int? = null, val assets: Map<String, String> = emptyMap(),
)
data class EvaluationInput(val bookId: String, val cardId: String, val known: Boolean, val durationMs: Long, val revealMs: Long? = null)
data class SettingsInput(
    val shortcuts: Boolean = true, val reveal: String = "Space", val unknown: String = "1", val known: String = "2",
    val alarm: Boolean = false, val alarmTime: String = "20:00", val timeLimit: Int = 0,
)
data class AlarmDateInput(val date: LocalDate)

data class BookDto(
    val id: String, val name: String, val desc: String, val icon: String, val category: String,
    val color: String, val ink: String, val archived: Boolean, val deleted: Boolean,
    val lastStudy: LocalDate?, val completed: LocalDate?,
)
data class CardDto(
    val id: String, val bookId: String, val type: String, val question: String, val answer: String,
    val explanation: String, val options: List<String>?, val correct: Int?, val level: Int,
    val assets: Map<String, String>,
)
data class HistoryDto(
    val id: String, val bookId: String, val cardId: String, val date: LocalDate, val at: Instant,
    val known: Boolean, val durationMs: Long, val revealMs: Long?, val levelAfter: Int,
)
data class CardResult(val card: CardDto, val book: BookDto)
data class EvaluationResult(val card: CardDto, val entry: HistoryDto, val book: BookDto)
data class BootstrapDto(
    val books: List<BookDto>, val cards: List<CardDto>, val history: List<HistoryDto>,
    val settings: SettingsInput, val alarmLastDate: String,
)
