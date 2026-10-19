import type {
  Book,
  BookInput,
  Card,
  CardInput,
  HistoryEntry,
  Settings,
} from '@/types'

export interface EvaluationPayload {
  bookId: string
  cardId: string
  known: boolean
  durationMs: number
  revealMs: number | null
}

export interface EvaluationResult {
  card: Card
  entry: HistoryEntry
  book: Book
}

export interface BootstrapData {
  books: Book[]
  cards: Card[]
  history: HistoryEntry[]
  settings: Settings
  alarmLastDate: string
}

/**
 * 서버 API 가 준비되면 이 인터페이스를 구현한 HTTP 클라이언트로 교체합니다.
 * 화면과 스토어는 이 계약에만 의존합니다.
 */
export interface StudyApi {
  bootstrap(): Promise<BootstrapData>

  createBook(input: BookInput): Promise<Book>
  updateBook(id: string, input: BookInput): Promise<Book>
  setBookState(id: string, state: { archived?: boolean; deleted?: boolean }): Promise<Book>
  purgeBook(id: string): Promise<void>

  createCard(bookId: string, input: CardInput): Promise<{ card: Card; book: Book }>
  updateCard(id: string, input: CardInput): Promise<{ card: Card; book: Book }>
  deleteCard(id: string): Promise<void>
  resetCardLevel(id: string): Promise<{ card: Card; book: Book }>

  submitEvaluation(payload: EvaluationPayload): Promise<EvaluationResult>
  completeBook(bookId: string): Promise<Book>

  saveSettings(settings: Settings): Promise<Settings>
  setAlarmLastDate(date: string): Promise<void>
}
