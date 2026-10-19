import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApi, setAuthApi } from '@/api'
import { createMockAuthApi } from '@/api/mock/auth'
import { createMockApi } from '@/api/mock'
import { useAppStore } from './app'
import { useAuthStore } from './auth'
import { useBookStore } from './books'
import { useHistoryStore } from './history'
import { useStudyStore } from './study'
import { todayKey } from '@/utils/date'

// 각 테스트가 서로 영향을 주지 않도록 매번 새 예시 데이터로 시작합니다.
beforeEach(() => {
  setApi(createMockApi({ storage: null }))
  setActivePinia(createPinia())
})

describe('문제집·카드 스토어', () => {
  it('예시 데이터를 불러와 보관·삭제 상태별로 나눕니다', async () => {
    await useAppStore().bootstrap()
    const books = useBookStore()
    expect(books.activeBooks.map((b) => b.id)).toEqual(['spring', 'circuit', 'network'])
    expect(books.archivedBooks).toHaveLength(1)
    expect(books.deletedBooks).toHaveLength(1)
  })

  it('오늘 학습한 문제집은 학습 예정 수가 0이고, 문제를 추가하면 다시 대상이 됩니다', async () => {
    await useAppStore().bootstrap()
    const books = useBookStore()
    expect(books.dueCount('circuit')).toBe(0)
    await books.createCard('circuit', {
      type: 'qa', question: '새 질문', answer: '새 답', explanation: '', assets: {},
    })
    expect(books.dueCount('circuit')).toBe(4)
    expect(books.cardsOf('circuit').at(-1)?.level).toBe(1)
  })

  it('암기 레벨 초기화는 해당 문제만 Level 1 로 되돌리고 기록은 유지합니다', async () => {
    await useAppStore().bootstrap()
    const books = useBookStore()
    const history = useHistoryStore()
    const target = books.cardsOf('spring').find((c) => c.level > 1)!
    const before = history.entries.length
    await books.resetCardLevel(target.id)
    expect(books.getCard(target.id)?.level).toBe(1)
    expect(history.entries).toHaveLength(before)
  })

  it('완전 삭제하면 문제집과 카드가 함께 사라집니다', async () => {
    await useAppStore().bootstrap()
    const books = useBookStore()
    await books.purgeBook('osi')
    expect(books.getBook('osi')).toBeUndefined()
    expect(books.cardsOf('osi')).toHaveLength(0)
  })
})

describe('학습 세션', () => {
  it('정답 확인 후 평가하면 레벨·기록·진행 위치가 갱신되고 마지막에는 완료 처리됩니다', async () => {
    await useAppStore().bootstrap()
    const books = useBookStore()
    const study = useStudyStore()
    const history = useHistoryStore()
    expect(study.start('network')).toBe(true)

    const first = study.card!
    const beforeLevel = first.level
    const beforeCount = history.entries.length

    // 정답을 확인하기 전에는 평가할 수 없습니다.
    await study.evaluate(true)
    expect(study.session?.index).toBe(0)

    study.resumeClock()
    study.reveal()
    await study.evaluate(true)
    expect(books.getCard(first.id)?.level).toBe(Math.min(5, beforeLevel + 1))
    expect(history.entries).toHaveLength(beforeCount + 1)
    expect(study.session?.index).toBe(1)
    expect(study.session?.known).toBe(1)

    while (!study.finished) {
      study.reveal()
      await study.evaluate(false)
    }
    expect(study.session?.known).toBe(1)
    expect(books.getBook('network')?.completed).toBe(todayKey())
    expect(books.getBook('network')?.lastStudy).toBe(todayKey())
  })

  it('레벨은 1~5 범위를 벗어나지 않습니다', async () => {
    await useAppStore().bootstrap()
    const books = useBookStore()
    const study = useStudyStore()
    study.start('circuit')
    const card = study.card!
    expect(card.level).toBe(1)
    study.reveal()
    await study.evaluate(false)
    expect(books.getCard(card.id)?.level).toBe(1)
  })

  it('제한시간이 있으면 마감 시각을 정하고, 수정 화면에서 돌아오면 남은 시간으로 이어집니다', async () => {
    await useAppStore().bootstrap()
    const study = useStudyStore()
    study.start('spring')
    study.armTimer(30, 1_000)
    expect(study.session?.deadline).toBe(31_000)

    study.suspendTimer(11_000)
    expect(study.session?.deadline).toBeNull()
    expect(study.session?.resumeRemaining).toBe(20_000)

    study.armTimer(30, 50_000)
    expect(study.session?.deadline).toBe(70_000)
    expect(study.session?.resumeRemaining).toBeNull()
  })

  it('제한시간 0 은 무제한입니다', async () => {
    await useAppStore().bootstrap()
    const study = useStudyStore()
    study.start('spring')
    study.armTimer(0)
    expect(study.session?.deadline).toBeNull()
  })

  it('빈 문제집은 학습을 시작할 수 없습니다', async () => {
    await useAppStore().bootstrap()
    const books = useBookStore()
    const study = useStudyStore()
    const book = await books.createBook({ name: '빈 문제집', desc: '', icon: '▤', category: '' })
    expect(study.start(book.id)).toBe(false)
  })
})

describe('인증 스토어', () => {
  it('저장된 로그인 정보가 없으면 로그인하지 않은 상태로 시작합니다', async () => {
    setAuthApi(createMockAuthApi(null))
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.restored).toBe(true)
    expect(auth.authenticated).toBe(false)
  })

  it('올바른 계정으로 로그인하고, 틀리면 오류를 던집니다', async () => {
    setAuthApi(createMockAuthApi(null))
    const auth = useAuthStore()
    await expect(auth.login('admin', 'wrong')).rejects.toThrow('아이디 또는 비밀번호')
    expect(auth.authenticated).toBe(false)
    await auth.login('admin', 'admin1234')
    expect(auth.user).toEqual({ username: 'admin' })
  })

  it('로그아웃하면 불러온 데이터와 학습 세션을 비웁니다', async () => {
    setAuthApi(createMockAuthApi(null))
    const auth = useAuthStore()
    await auth.login('admin', 'admin1234')
    await useAppStore().bootstrap()
    useStudyStore().start('spring')
    expect(useBookStore().activeBooks.length).toBeGreaterThan(0)

    await auth.logout()
    expect(auth.authenticated).toBe(false)
    expect(useBookStore().activeBooks).toHaveLength(0)
    expect(useHistoryStore().entries).toHaveLength(0)
    expect(useStudyStore().session).toBeNull()
    expect(useAppStore().loaded).toBe(false)
  })
})
