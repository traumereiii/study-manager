import type { BookCategory, CardType, Level, Settings } from '@/types'

export const CARD_TYPES: { value: CardType; label: string; hint: string }[] = [
  { value: 'qa', label: '질문 & 답변', hint: '질문을 읽고 답 떠올리기' },
  { value: 'blank', label: '빈칸 채우기', hint: '빠진 단어 기억하기' },
  { value: 'choice', label: '선다형', hint: '보기에서 정답 고르기' },
]

export const cardTypeLabel = (type: CardType): string =>
  CARD_TYPES.find((item) => item.value === type)?.label ?? type

export const BOOK_CATEGORIES: BookCategory[] = ['단어', '용어', '개념']

export const BOOK_ICONS: { value: string; label: string }[] = [
  { value: '▤', label: '책' },
  { value: '⌘', label: '개발' },
  { value: 'ϟ', label: '전기' },
  { value: '⊞', label: '네트워크' },
  { value: '✎', label: '필기' },
  { value: '∑', label: '수학' },
  { value: '◎', label: '언어' },
  { value: '⚗', label: '과학' },
  { value: '♫', label: '음악' },
  { value: '★', label: '별' },
]

/** 레벨 1~5 막대 색상 (DESIGN.md 2장) */
export const LEVEL_COLORS = ['#dbe4d3', '#bfd0af', '#9fb98b', '#799c65', '#47754c']
export const LEVELS: Level[] = [1, 2, 3, 4, 5]

export const KEY_OPTIONS = ['Space', 'Enter', '1', '2', '3', 'a', 's', 'd', 'j', 'k', 'l']
export const keyLabel = (key: string): string =>
  key === 'Space' ? '스페이스' : key === 'Enter' ? 'Enter' : key.toUpperCase()

export const DEFAULT_SETTINGS: Settings = {
  shortcuts: true,
  reveal: 'Space',
  unknown: '1',
  known: '2',
  alarm: false,
  alarmTime: '20:00',
  timeLimit: 0,
}

export const DEFAULT_BOOK_COLOR = { color: '#eaf1e2', ink: '#648346' }

export const PAGE_SIZE = 10
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
