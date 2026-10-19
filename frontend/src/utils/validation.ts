import { BOOK_CATEGORIES, BOOK_ICONS, KEY_OPTIONS } from '@/constants'
import type { BookInput, CardInput, Settings } from '@/types'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

function fail(message: string): never {
  throw new ValidationError(message)
}

export function validateBookInput(input: BookInput): BookInput {
  const name = input.name.trim()
  const desc = input.desc.trim()
  if (!name || name.length > 60) fail('문제집 이름을 1~60자로 입력해 주세요.')
  if (desc.length > 160) fail('한 줄 소개는 160자 이하로 입력해 주세요.')
  if (input.category && !BOOK_CATEGORIES.includes(input.category)) {
    fail('문제집 유형을 목록에서 선택해 주세요.')
  }
  if (!BOOK_ICONS.some((icon) => icon.value === input.icon)) {
    fail('아이콘을 목록에서 선택해 주세요.')
  }
  return { name, desc, icon: input.icon, category: input.category }
}

export function validateCardInput(input: CardInput): CardInput {
  const question = input.question.trim()
  const explanation = input.explanation.trim()
  if (!['qa', 'blank', 'choice'].includes(input.type)) fail('문제 유형을 선택해 주세요.')
  if (!question || question.length > 20000) fail('문제 내용을 1~20,000자로 입력해 주세요.')
  if (explanation.length > 20000) fail('해설은 20,000자 이하로 입력해 주세요.')
  if (input.type === 'blank' && !/_{2,}/.test(question)) {
    fail('문제의 빈칸을 밑줄 두 개 이상(__)으로 표시해 주세요.')
  }

  const result: CardInput = { type: input.type, question, answer: '', explanation, assets: {} }
  if (input.type === 'choice') {
    const options = (input.options ?? []).map((option) => option.trim())
    if (options.length !== 4 || options.some((option) => !option)) fail('보기 4개를 모두 입력해 주세요.')
    if (options.some((option) => option.length > 5000)) fail('보기는 각각 5,000자 이하로 입력해 주세요.')
    if (new Set(options).size !== 4) fail('보기를 서로 다르게 입력해 주세요.')
    const correct = input.correct
    if (correct == null || !Number.isInteger(correct) || correct < 0 || correct > 3) {
      fail('정답인 보기를 선택해 주세요.')
    }
    result.options = options
    result.correct = correct as number
    result.answer = options[correct as number]
  } else {
    const answer = input.answer.trim()
    if (!answer || answer.length > 20000) fail('정답을 1~20,000자로 입력해 주세요.')
    result.answer = answer
  }

  // 본문에서 참조하는 이미지만 남깁니다.
  const content = [result.question, result.answer, result.explanation, ...(result.options ?? [])].join('\n')
  const referenced = new Set([...content.matchAll(/asset:(img-[\w-]+)/g)].map((match) => match[1]))
  for (const id of referenced) {
    if (input.assets[id]) result.assets[id] = input.assets[id]
  }
  return result
}

export function validateSettings(input: Settings): Settings {
  const keys = [input.reveal, input.unknown, input.known]
  if (!keys.every((key) => KEY_OPTIONS.includes(key)) || new Set(keys).size !== 3) {
    fail('단축키는 서로 다른 키로 설정해 주세요.')
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.alarmTime)) fail('올바른 알림 시간을 입력해 주세요.')
  const limit = input.timeLimit
  if (!Number.isInteger(limit) || limit < 0 || limit > 600) {
    fail('제한시간은 0~600 사이의 정수로 입력해 주세요.')
  }
  return { ...input }
}
