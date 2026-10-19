import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Card } from '@/types'
import { useBookStore } from './books'
import { useHistoryStore } from './history'

interface CardClock {
  cardId: string
  elapsedMs: number
  runningSince: number | null
}

export interface StudySession {
  bookId: string
  /** 시작 시점의 카드 순서. 학습 도중 문제가 추가돼도 이번 세션에는 영향이 없습니다. */
  cardIds: string[]
  index: number
  known: number
  revealed: boolean
  selected: number | null
  timedOut: boolean
  /** 정답 확인까지 걸린 시간(ms) */
  revealMs: number | null
  /** 제한시간 종료 시각(epoch ms). 제한이 없거나 정답을 확인했다면 null */
  deadline: number | null
  /** 수정 화면에서 돌아올 때 이어서 사용할 남은 시간(ms) */
  resumeRemaining: number | null
  clock: CardClock | null
}

export const useStudyStore = defineStore('study', () => {
  const session = ref<StudySession | null>(null)

  const book = computed(() =>
    session.value ? useBookStore().getBook(session.value.bookId) : undefined,
  )
  const total = computed(() => session.value?.cardIds.length ?? 0)
  const finished = computed(() => !!session.value && session.value.index >= session.value.cardIds.length)
  const card = computed<Card | undefined>(() => {
    const current = session.value
    if (!current || current.index >= current.cardIds.length) return undefined
    return useBookStore().getCard(current.cardIds[current.index])
  })

  function start(bookId: string): boolean {
    const cardIds = useBookStore().cardsOf(bookId).map((item) => item.id)
    if (!cardIds.length) return false
    session.value = {
      bookId, cardIds, index: 0, known: 0, revealed: false, selected: null,
      timedOut: false, revealMs: null, deadline: null, resumeRemaining: null, clock: null,
    }
    return true
  }

  function end() {
    session.value = null
  }

  /* ── 카드 학습 시간: 화면을 보고 있는 시간만 누적합니다 ── */
  function resumeClock(now = Date.now()) {
    const current = session.value
    const cardId = current?.cardIds[current.index]
    if (!current || !cardId) return
    if (current.clock?.cardId !== cardId) current.clock = { cardId, elapsedMs: 0, runningSince: null }
    if (current.clock.runningSince == null) current.clock.runningSince = now
  }

  function pauseClock(now = Date.now()) {
    const clock = session.value?.clock
    if (clock && clock.runningSince != null) {
      clock.elapsedMs += Math.max(0, now - clock.runningSince)
      clock.runningSince = null
    }
  }

  function elapsed(now = Date.now()): number {
    const clock = session.value?.clock
    if (!clock) return 0
    return Math.max(0, Math.round(clock.elapsedMs + (clock.runningSince == null ? 0 : now - clock.runningSince)))
  }

  /* ── 제한시간 ── */
  /** 현재 카드의 제한시간을 설정합니다. 이미 설정돼 있거나 정답을 확인했다면 그대로 둡니다. */
  function armTimer(limitSeconds: number, now = Date.now()) {
    const current = session.value
    if (!current || current.revealed || current.deadline != null) return
    if (current.resumeRemaining != null) {
      current.deadline = now + current.resumeRemaining
      current.resumeRemaining = null
    } else if (limitSeconds > 0) {
      current.deadline = now + limitSeconds * 1000
    }
  }

  /** 수정 화면으로 이동하기 전에 남은 시간을 보관합니다. */
  function suspendTimer(now = Date.now()) {
    const current = session.value
    if (!current) return
    if (current.deadline != null && !current.revealed) {
      current.resumeRemaining = Math.max(0, current.deadline - now)
    }
    current.deadline = null
  }

  /* ── 진행 ── */
  function select(optionIndex: number) {
    if (session.value && !session.value.revealed) session.value.selected = optionIndex
  }

  function reveal(options: { timedOut?: boolean } = {}) {
    const current = session.value
    if (!current || current.revealed) return
    current.revealMs = elapsed()
    current.revealed = true
    current.timedOut = options.timedOut === true
    current.deadline = null
  }

  /** 정답을 확인한 뒤 자기 평가를 기록하고 다음 카드로 이동합니다. */
  async function evaluate(known: boolean) {
    const current = session.value
    const target = card.value
    if (!current || !target || !current.revealed) return
    pauseClock()
    const result = await useBookStore().evaluate({
      bookId: current.bookId,
      cardId: target.id,
      known,
      durationMs: elapsed(),
      revealMs: current.revealMs,
    })
    useHistoryStore().add(result.entry)
    current.known += known ? 1 : 0
    current.index += 1
    current.revealed = false
    current.selected = null
    current.timedOut = false
    current.revealMs = null
    current.deadline = null
    current.resumeRemaining = null
    if (current.index >= current.cardIds.length) {
      await useBookStore().completeBook(current.bookId)
    } else {
      resumeClock()
    }
  }

  /** 학습 중 문제를 수정하고 돌아오면 같은 문제를 처음 상태로 다시 보여 줍니다. */
  function resetCurrentCard() {
    const current = session.value
    if (!current) return
    current.revealed = false
    current.selected = null
    current.timedOut = false
    current.revealMs = null
    current.deadline = null
    current.resumeRemaining = null
  }

  return {
    session, book, card, total, finished,
    start, end, resumeClock, pauseClock, elapsed,
    armTimer, suspendTimer, select, reveal, evaluate, resetCurrentCard,
  }
})
