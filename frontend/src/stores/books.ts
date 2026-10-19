import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api'
import type { EvaluationPayload } from '@/api/types'
import { LEVELS } from '@/constants'
import type { Book, BookInput, Card, CardInput } from '@/types'
import { todayKey } from '@/utils/date'

export const useBookStore = defineStore('books', () => {
  const books = ref<Book[]>([])
  const cards = ref<Card[]>([])

  const activeBooks = computed(() => books.value.filter((book) => !book.archived && !book.deleted))
  const archivedBooks = computed(() => books.value.filter((book) => book.archived && !book.deleted))
  const deletedBooks = computed(() => books.value.filter((book) => book.deleted))

  const getBook = (id: string): Book | undefined => books.value.find((book) => book.id === id)
  const cardsOf = (bookId: string): Card[] => cards.value.filter((card) => card.bookId === bookId)
  const getCard = (id: string): Card | undefined => cards.value.find((card) => card.id === id)

  /** 문제집의 평균 암기 레벨 (카드가 없으면 0) */
  const averageLevel = (bookId: string): number => {
    const list = cardsOf(bookId)
    return list.length ? list.reduce((sum, card) => sum + card.level, 0) / list.length : 0
  }

  const levelCounts = (bookId: string): number[] => {
    const list = cardsOf(bookId)
    return LEVELS.map((level) => list.filter((card) => card.level === level).length)
  }

  /** 오늘 학습 예정 수: 오늘 완료했거나 보관·삭제 상태면 0, 아니면 전체 카드 수 */
  const dueCount = (bookId: string): number => {
    const book = getBook(bookId)
    if (!book || book.archived || book.deleted || book.completed === todayKey()) return 0
    return cardsOf(bookId).length
  }

  function hydrate(data: { books: Book[]; cards: Card[] }) {
    books.value = data.books
    cards.value = data.cards
  }

  const replaceBook = (next: Book) => {
    const index = books.value.findIndex((book) => book.id === next.id)
    if (index >= 0) books.value[index] = next
    else books.value.push(next)
  }
  const replaceCard = (next: Card) => {
    const index = cards.value.findIndex((card) => card.id === next.id)
    if (index >= 0) cards.value[index] = next
    else cards.value.push(next)
  }

  async function createBook(input: BookInput): Promise<Book> {
    const book = await api.createBook(input)
    replaceBook(book)
    return book
  }

  async function updateBook(id: string, input: BookInput): Promise<Book> {
    const book = await api.updateBook(id, input)
    replaceBook(book)
    return book
  }

  async function setBookState(id: string, state: { archived?: boolean; deleted?: boolean }) {
    replaceBook(await api.setBookState(id, state))
  }

  async function purgeBook(id: string) {
    await api.purgeBook(id)
    books.value = books.value.filter((book) => book.id !== id)
    cards.value = cards.value.filter((card) => card.bookId !== id)
  }

  async function createCard(bookId: string, input: CardInput): Promise<Card> {
    const { card, book } = await api.createCard(bookId, input)
    replaceCard(card)
    replaceBook(book)
    return card
  }

  async function updateCard(id: string, input: CardInput): Promise<Card> {
    const { card, book } = await api.updateCard(id, input)
    replaceCard(card)
    replaceBook(book)
    return card
  }

  async function deleteCard(id: string) {
    await api.deleteCard(id)
    cards.value = cards.value.filter((card) => card.id !== id)
  }

  async function resetCardLevel(id: string): Promise<Card> {
    const { card, book } = await api.resetCardLevel(id)
    replaceCard(card)
    replaceBook(book)
    return card
  }

  async function evaluate(payload: EvaluationPayload) {
    const result = await api.submitEvaluation(payload)
    replaceCard(result.card)
    replaceBook(result.book)
    return result
  }

  async function completeBook(bookId: string) {
    replaceBook(await api.completeBook(bookId))
  }

  return {
    books, cards, activeBooks, archivedBooks, deletedBooks,
    getBook, cardsOf, getCard, averageLevel, levelCounts, dueCount,
    hydrate, createBook, updateBook, setBookState, purgeBook,
    createCard, updateCard, deleteCard, resetCardLevel, evaluate, completeBook,
  }
})
