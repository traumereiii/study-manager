import { DEFAULT_BOOK_COLOR } from '@/constants'
import type { Book, Card, Level } from '@/types'
import { todayKey } from '@/utils/date'
import { validateBookInput, validateCardInput, validateSettings } from '@/utils/validation'
import type { StudyApi } from '../types'
import { createSeed, type MockDb } from './seed'

const STORAGE_KEY = 'chagok-vue-mock-v1'

const clone = <T>(value: T): T => structuredClone(value)
const clampLevel = (value: number): Level => Math.max(1, Math.min(5, value)) as Level
const newId = (prefix: string): string => `${prefix}-${crypto.randomUUID()}`

function loadDb(storage: Storage | null): MockDb {
  if (storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as MockDb
        if (Array.isArray(parsed.books) && Array.isArray(parsed.cards) && Array.isArray(parsed.history)) {
          return parsed
        }
      }
    } catch {
      // 손상된 저장 데이터는 무시하고 예시 데이터로 시작합니다.
    }
  }
  return createSeed()
}

export interface MockApiOptions {
  /** 새로고침 후에도 변경 내용을 유지할 저장소. `null` 이면 메모리에만 보관합니다. */
  storage?: Storage | null
}

/**
 * 서버 없이 화면을 개발하기 위한 모킹 API 입니다.
 * 메모리의 데이터를 변경하고, 가능하면 localStorage 에도 반영합니다.
 */
export function createMockApi(options: MockApiOptions = {}): StudyApi {
  const storage = options.storage === undefined ? safeLocalStorage() : options.storage
  const db = loadDb(storage)

  const persist = () => {
    if (!storage) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      // 저장 공간이 없어도 현재 세션에서는 계속 사용할 수 있습니다.
    }
  }

  const findBook = (id: string): Book => {
    const book = db.books.find((item) => item.id === id)
    if (!book) throw new Error('문제집을 찾을 수 없습니다.')
    return book
  }
  const findCard = (id: string): Card => {
    const card = db.cards.find((item) => item.id === id)
    if (!card) throw new Error('문제를 찾을 수 없습니다.')
    return card
  }

  return {
    async bootstrap() {
      return clone({
        books: db.books,
        cards: db.cards,
        history: db.history,
        settings: db.settings,
        alarmLastDate: db.alarmLastDate,
      })
    },

    async createBook(input) {
      const value = validateBookInput(input)
      const book: Book = {
        id: newId('custom'),
        ...value,
        ...DEFAULT_BOOK_COLOR,
        archived: false,
        deleted: false,
        lastStudy: null,
        completed: null,
      }
      db.books.push(book)
      persist()
      return clone(book)
    },

    async updateBook(id, input) {
      const book = findBook(id)
      Object.assign(book, validateBookInput(input))
      persist()
      return clone(book)
    },

    async setBookState(id, state) {
      const book = findBook(id)
      if (state.archived !== undefined) book.archived = state.archived
      if (state.deleted !== undefined) book.deleted = state.deleted
      persist()
      return clone(book)
    },

    async purgeBook(id) {
      findBook(id)
      db.books = db.books.filter((book) => book.id !== id)
      db.cards = db.cards.filter((card) => card.bookId !== id)
      db.history = db.history.filter((entry) => entry.bookId !== id)
      persist()
    },

    async createCard(bookId, input) {
      const book = findBook(bookId)
      const card: Card = { id: newId('card'), bookId, level: 1, ...validateCardInput(input) }
      db.cards.push(card)
      // 문제가 추가되면 오늘 학습 대상으로 다시 표시합니다.
      book.completed = null
      persist()
      return clone({ card, book })
    },

    async updateCard(id, input) {
      const previous = findCard(id)
      const next = validateCardInput(input)
      const card: Card = {
        id: previous.id,
        bookId: previous.bookId,
        level: previous.level,
        ...next,
      }
      // 유형 변경 시 이전 유형의 보기 정보가 남지 않도록 통째로 교체합니다.
      db.cards[db.cards.indexOf(previous)] = card
      const book = findBook(card.bookId)
      book.completed = null
      persist()
      return clone({ card, book })
    },

    async deleteCard(id) {
      findCard(id)
      db.cards = db.cards.filter((item) => item.id !== id)
      // 이전 학습 통계는 유지합니다.
      persist()
    },

    async resetCardLevel(id) {
      const card = findCard(id)
      card.level = 1
      const book = findBook(card.bookId)
      book.completed = null
      persist()
      return clone({ card, book })
    },

    async submitEvaluation(payload) {
      const card = findCard(payload.cardId)
      const book = findBook(payload.bookId)
      card.level = clampLevel(card.level + (payload.known ? 1 : -1))
      const now = new Date()
      const entry = {
        id: newId('history'),
        bookId: payload.bookId,
        cardId: payload.cardId,
        date: todayKey(),
        at: now.toISOString(),
        known: payload.known,
        durationMs: Math.max(0, Math.round(payload.durationMs)),
        revealMs: payload.revealMs == null ? null : Math.max(0, Math.round(payload.revealMs)),
        levelAfter: card.level,
      }
      db.history.push(entry)
      book.lastStudy = todayKey()
      persist()
      return clone({ card, entry, book })
    },

    async completeBook(bookId) {
      const book = findBook(bookId)
      book.completed = todayKey()
      persist()
      return clone(book)
    },

    async saveSettings(settings) {
      db.settings = validateSettings(settings)
      persist()
      return clone(db.settings)
    },

    async setAlarmLastDate(date) {
      db.alarmLastDate = date
      persist()
    },
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
