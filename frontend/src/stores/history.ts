import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { HistoryEntry } from '@/types'
import { toDateKey } from '@/utils/date'

export interface DayStat {
  key: string
  label: string
  count: number
  known: number
}

export interface CardStats {
  entries: HistoryEntry[]
  total: number
  known: number
  unknown: number
  /** 알아요 비율(%) — 기록이 없으면 null */
  ratio: number | null
  totalMs: number | null
  averageMs: number | null
  last: HistoryEntry | undefined
}

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<HistoryEntry[]>([])

  function hydrate(list: HistoryEntry[]) {
    entries.value = list
  }

  function add(entry: HistoryEntry) {
    entries.value.push(entry)
  }

  /** 오늘을 포함한 최근 7일의 평가 횟수 */
  const weekly = computed<DayStat[]>(() =>
    Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - 6 + index)
      const key = toDateKey(date)
      const list = entries.value.filter((entry) => entry.date === key)
      return {
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: list.length,
        known: list.filter((entry) => entry.known).length,
      }
    }),
  )

  const summary = computed(() => {
    const total = entries.value.length
    const known = entries.value.filter((entry) => entry.known).length
    return {
      today: weekly.value[6].count,
      total,
      ratio: total ? Math.round((known / total) * 100) : 0,
      activeDays: new Set(entries.value.map((entry) => entry.date)).size,
    }
  })

  function bookStats(bookId: string) {
    const list = entries.value.filter((entry) => entry.bookId === bookId)
    const known = list.filter((entry) => entry.known).length
    return {
      total: list.length,
      ratio: list.length ? Math.round((known / list.length) * 100) : null,
    }
  }

  function cardStats(cardId: string): CardStats {
    const list = entries.value.filter((entry) => entry.cardId === cardId)
    const timed = list.filter((entry) => Number.isFinite(entry.durationMs))
    const totalMs = timed.reduce((sum, entry) => sum + entry.durationMs, 0)
    const known = list.filter((entry) => entry.known).length
    return {
      entries: list,
      total: list.length,
      known,
      unknown: list.length - known,
      ratio: list.length ? Math.round((known / list.length) * 100) : null,
      totalMs: timed.length ? totalMs : null,
      averageMs: timed.length ? totalMs / timed.length : null,
      last: list.at(-1),
    }
  }

  return { entries, weekly, summary, hydrate, add, bookStats, cardStats }
})
