import { describe, expect, it } from 'vitest'
import type { Card } from '@/types'
import { filterCards, paginate } from './cards'
import { renderMarkdown } from './markdown'
import { ValidationError, validateBookInput, validateCardInput, validateSettings } from './validation'
import { DEFAULT_SETTINGS } from '@/constants'

const card = (over: Partial<Card>): Card => ({
  id: 'c', bookId: 'b', type: 'qa', question: 'Q', answer: 'A', explanation: '', level: 1, assets: {}, ...over,
})

describe('validateCardInput', () => {
  const base = { type: 'qa' as const, question: ' 질문 ', answer: ' 답 ', explanation: '', assets: {} }

  it('앞뒤 공백을 제거합니다', () => {
    const result = validateCardInput(base)
    expect(result.question).toBe('질문')
    expect(result.answer).toBe('답')
  })

  it('빈칸형은 밑줄 두 개 이상이 필요합니다', () => {
    expect(() => validateCardInput({ ...base, type: 'blank' })).toThrow(ValidationError)
    expect(() => validateCardInput({ ...base, type: 'blank', question: 'TCP는 ____ 입니다' })).not.toThrow()
  })

  it('선다형은 서로 다른 보기 4개와 정답 선택이 필요합니다', () => {
    const choice = { ...base, type: 'choice' as const, options: ['a', 'b', 'c', 'd'], correct: 2 }
    expect(validateCardInput(choice).answer).toBe('c')
    expect(() => validateCardInput({ ...choice, options: ['a', 'a', 'c', 'd'] })).toThrow('서로 다르게')
    expect(() => validateCardInput({ ...choice, correct: undefined })).toThrow('정답인 보기')
    expect(() => validateCardInput({ ...choice, options: ['a', '', 'c', 'd'] })).toThrow('4개를 모두')
  })

  it('본문에서 참조하지 않는 이미지 자산은 제거합니다', () => {
    const result = validateCardInput({
      ...base,
      question: '![x](asset:img-1)',
      assets: { 'img-1': 'data:a', 'img-2': 'data:b' },
    })
    expect(Object.keys(result.assets)).toEqual(['img-1'])
  })
})

describe('validateBookInput / validateSettings', () => {
  it('문제집 이름은 1~60자여야 합니다', () => {
    const input = { name: '  ', desc: '', icon: '▤', category: '' as const }
    expect(() => validateBookInput(input)).toThrow('1~60자')
    expect(validateBookInput({ ...input, name: ' 이름 ' }).name).toBe('이름')
  })

  it('단축키는 서로 달라야 하고 제한시간은 0~600 정수입니다', () => {
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, known: '1' })).toThrow('서로 다른 키')
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, timeLimit: 601 })).toThrow('0~600')
    expect(() => validateSettings({ ...DEFAULT_SETTINGS, timeLimit: 1.5 })).toThrow('0~600')
    expect(validateSettings({ ...DEFAULT_SETTINGS, timeLimit: 30 }).timeLimit).toBe(30)
  })
})

describe('filterCards / paginate', () => {
  const cards = [
    card({ id: '1', question: 'Spring Security', level: 1 }),
    card({ id: '2', question: '네트워크', answer: 'TCP', level: 2 }),
    card({ id: '3', question: '선택', type: 'choice', options: ['DNS', 'HTTP'], level: 2 }),
  ]

  it('질문·정답·보기를 대소문자 구분 없이 검색하고 레벨과 함께 적용합니다', () => {
    expect(filterCards(cards, { query: 'spring', level: 0 }).map((c) => c.id)).toEqual(['1'])
    expect(filterCards(cards, { query: 'tcp', level: 0 }).map((c) => c.id)).toEqual(['2'])
    expect(filterCards(cards, { query: 'dns', level: 0 }).map((c) => c.id)).toEqual(['3'])
    expect(filterCards(cards, { query: '', level: 2 }).map((c) => c.id)).toEqual(['2', '3'])
    expect(filterCards(cards, { query: 'tcp', level: 1 })).toEqual([])
  })

  it('범위를 벗어난 페이지를 유효한 페이지로 보정합니다', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    expect(paginate(items, 1).items).toHaveLength(10)
    expect(paginate(items, 3)).toMatchObject({ page: 3, from: 21, to: 23, totalPages: 3 })
    expect(paginate(items, 99).page).toBe(3)
    expect(paginate(items, -4).page).toBe(1)
    expect(paginate([], 1)).toMatchObject({ page: 1, totalPages: 1, from: 0, to: 0 })
  })
})

describe('renderMarkdown', () => {
  it('서식을 HTML 로 변환합니다', () => {
    expect(renderMarkdown('**굵게**')).toContain('<strong>굵게</strong>')
  })

  it('원문 HTML 과 스크립트를 실행 가능한 형태로 남기지 않습니다', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>')
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/<img/i)
  })

  it('javascript: 링크를 제거하고 https 링크는 새 창 속성과 함께 남깁니다', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('href')
    const html = renderMarkdown('[문서](https://example.com)')
    expect(html).toContain('href="https://example.com/"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('asset 이미지는 허용된 data URL 만 표시합니다', () => {
    const ok = 'data:image/png;base64,AAAA'
    expect(renderMarkdown('![a](asset:img-1)', { 'img-1': ok })).toContain(`src="${ok}"`)
    expect(renderMarkdown('![a](asset:img-1)', { 'img-1': 'data:text/html;base64,AAAA' })).not.toContain('<img')
    expect(renderMarkdown('![a](asset:img-9)', {})).not.toContain('<img')
  })
})
