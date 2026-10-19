export type CardType = 'qa' | 'blank' | 'choice'
export type BookCategory = '단어' | '용어' | '개념'
export type Level = 1 | 2 | 3 | 4 | 5

export interface Card {
  id: string
  bookId: string
  type: CardType
  question: string
  answer: string
  explanation: string
  /** 선다형 보기 4개 */
  options?: string[]
  /** 선다형 정답 보기 인덱스 */
  correct?: number
  level: Level
  /** Markdown 에서 `asset:<id>` 로 참조하는 이미지 데이터 */
  assets: Record<string, string>
}

export interface Book {
  id: string
  name: string
  desc: string
  icon: string
  category: BookCategory | ''
  color: string
  ink: string
  archived: boolean
  deleted: boolean
  /** YYYY-MM-DD */
  lastStudy: string | null
  /** 당일 학습을 마친 날짜 (YYYY-MM-DD) */
  completed: string | null
}

export interface BookWithCards extends Book {
  cards: Card[]
}

export interface HistoryEntry {
  id: string
  bookId: string
  cardId: string
  /** YYYY-MM-DD */
  date: string
  /** ISO 시각 */
  at: string
  known: boolean
  /** 문제 표시부터 평가까지(ms) */
  durationMs: number
  /** 문제 표시부터 정답 확인까지(ms) */
  revealMs: number | null
  levelAfter: Level
}

export interface Settings {
  shortcuts: boolean
  reveal: string
  unknown: string
  known: string
  alarm: boolean
  /** HH:mm */
  alarmTime: string
  /** 0 = 무제한, 최대 600 */
  timeLimit: number
}

export interface BookInput {
  name: string
  desc: string
  icon: string
  category: BookCategory | ''
}

export interface CardInput {
  type: CardType
  question: string
  answer: string
  explanation: string
  options?: string[]
  correct?: number
  assets: Record<string, string>
}
