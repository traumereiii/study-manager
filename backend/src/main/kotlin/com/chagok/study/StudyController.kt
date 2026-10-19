package com.chagok.study

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1")
class StudyController(private val study: StudyService) {
    @GetMapping("/bootstrap")
    fun bootstrap() = study.bootstrap()

    @PostMapping("/books")
    @ResponseStatus(HttpStatus.CREATED)
    fun createBook(@RequestBody input: BookInput) = study.createBook(input)

    @PutMapping("/books/{bookId}")
    fun updateBook(@PathVariable bookId: String, @RequestBody input: BookInput) = study.updateBook(bookId, input)

    @PatchMapping("/books/{bookId}/state")
    fun setBookState(@PathVariable bookId: String, @RequestBody input: BookStateInput) = study.setBookState(bookId, input)

    @DeleteMapping("/books/{bookId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun purgeBook(@PathVariable bookId: String) = study.purgeBook(bookId)

    @PostMapping("/books/{bookId}/cards")
    @ResponseStatus(HttpStatus.CREATED)
    fun createCard(@PathVariable bookId: String, @RequestBody input: CardInput) = study.createCard(bookId, input)

    @PutMapping("/cards/{cardId}")
    fun updateCard(@PathVariable cardId: String, @RequestBody input: CardInput) = study.updateCard(cardId, input)

    @DeleteMapping("/cards/{cardId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteCard(@PathVariable cardId: String) = study.deleteCard(cardId)

    @PostMapping("/cards/{cardId}/level-reset")
    fun resetLevel(@PathVariable cardId: String) = study.resetCardLevel(cardId)

    @PostMapping("/evaluations")
    fun evaluate(@RequestHeader("Idempotency-Key") key: String, @RequestBody input: EvaluationInput) = study.evaluate(key, input)

    @PostMapping("/books/{bookId}/completion")
    fun complete(@PathVariable bookId: String) = study.completeBook(bookId)

    @PutMapping("/settings")
    fun settings(@RequestBody input: SettingsInput) = study.saveSettings(input)

    @PutMapping("/settings/alarm-last-date")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun alarmDate(@RequestBody input: AlarmDateInput) = study.setAlarmDate(input.date)
}
