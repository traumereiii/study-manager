package com.chagok.study

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface BookRepository : JpaRepository<BookEntity, String> {
    fun findAllByOrderByCreatedAtAscIdAsc(): List<BookEntity>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from BookEntity b where b.id = :id")
    fun lockById(id: String): BookEntity?
}

interface CardRepository : JpaRepository<CardEntity, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CardEntity c where c.id = :id")
    fun lockById(id: String): CardEntity?

    @Query("select c.bookId from CardEntity c where c.id = :id")
    fun findBookId(id: String): String?

    fun findAllByOrderByCreatedAtAscIdAsc(): List<CardEntity>
    fun countByBookId(bookId: String): Long
}

interface CardAssetRepository : JpaRepository<CardAssetEntity, String> {
    fun findAllByCardId(cardId: String): List<CardAssetEntity>

    @Modifying(flushAutomatically = true)
    @Query("delete from CardAssetEntity a where a.cardId = :cardId")
    fun removeByCardId(cardId: String)
}

interface EvaluationRepository : JpaRepository<EvaluationEntity, String> {
    fun findAllByOrderByAtAscIdAsc(): List<EvaluationEntity>
}

interface EvaluationRequestRepository : JpaRepository<EvaluationRequestEntity, String>

interface SettingsRepository : JpaRepository<SettingsEntity, Int> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SettingsEntity s where s.id = 1")
    fun lockSettings(): SettingsEntity
}
