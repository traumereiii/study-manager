import { PAGE_SIZE } from '@/constants'
import type { Card } from '@/types'

export interface CardFilter {
  query: string
  /** 0 이면 전체 레벨 */
  level: number
}

/** 질문·정답·해설·선다형 보기에서 검색어를 찾습니다. 대소문자는 구분하지 않습니다. */
export function filterCards(cards: Card[], filter: CardFilter): Card[] {
  const query = filter.query.trim().toLowerCase()
  return cards.filter((card) => {
    if (filter.level && card.level !== filter.level) return false
    if (!query) return true
    return [card.question, card.answer, card.explanation, ...(card.options ?? [])]
      .some((text) => text.toLowerCase().includes(query))
  })
}

export interface Page<T> {
  items: T[]
  page: number
  totalPages: number
  total: number
  /** 1부터 시작하는 표시 범위 */
  from: number
  to: number
}

/** 요청한 페이지가 범위를 벗어나면 가장 가까운 유효 페이지로 보정합니다. */
export function paginate<T>(items: T[], requestedPage: number, size = PAGE_SIZE): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const page = Math.min(Math.max(1, Math.trunc(requestedPage) || 1), totalPages)
  const start = (page - 1) * size
  const slice = items.slice(start, start + size)
  return {
    items: slice,
    page,
    totalPages,
    total: items.length,
    from: slice.length ? start + 1 : 0,
    to: start + slice.length,
  }
}
