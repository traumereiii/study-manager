import { describe, expect, it, vi } from 'vitest'
import { ApiError, createHttpClient } from './client'
import { createHttpApi, createHttpAuthApi } from './index'
import { createTokenStore } from './tokens'

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

interface Recorded {
  method: string
  url: string
  headers: Record<string, string>
  body: unknown
}

/** 요청을 기록하고 준비한 응답을 순서대로 돌려주는 가짜 fetch */
function fakeFetch(responses: Array<Response | Error>) {
  const calls: Recorded[] = []
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      method: init?.method ?? 'GET',
      url: String(input),
      headers: init?.headers as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    })
    const next = responses.shift()
    if (!next) throw new Error('준비된 응답이 없습니다.')
    if (next instanceof Error) throw next
    return next
  }) as unknown as typeof fetch
  return { impl, calls }
}

function setup(responses: Array<Response | Error>, initial = { accessToken: 'a1', refreshToken: 'r1' }) {
  const tokens = createTokenStore(null)
  if (initial) tokens.write(initial)
  const onExpired = vi.fn()
  const { impl, calls } = fakeFetch(responses)
  const client = createHttpClient({ baseUrl: '/api/v1/', tokens, onExpired, fetchImpl: impl })
  return { client, tokens, onExpired, calls }
}

describe('HTTP 클라이언트', () => {
  it('저장된 AccessToken 을 Bearer 헤더로 보냅니다', async () => {
    const { client, calls } = setup([json(200, { ok: true })])
    await client.request('GET', '/bootstrap')
    expect(calls[0].url).toBe('/api/v1/bootstrap')
    expect(calls[0].headers.Authorization).toBe('Bearer a1')
  })

  it('401 을 받으면 재발급한 뒤 같은 요청을 한 번 다시 보내고 새 토큰을 저장합니다', async () => {
    const { client, tokens, calls } = setup([
      json(401, { code: 'UNAUTHORIZED', message: '만료' }),
      json(200, { accessToken: 'a2', refreshToken: 'r2' }),
      json(200, { done: true }),
    ])
    await expect(client.request('GET', '/bootstrap')).resolves.toEqual({ done: true })
    expect(calls.map((call) => call.url)).toEqual(['/api/v1/bootstrap', '/api/v1/auth/refresh', '/api/v1/bootstrap'])
    // 재발급 요청에는 만료된 AccessToken 을 붙이지 않습니다.
    expect(calls[1].headers.Authorization).toBeUndefined()
    expect(calls[1].body).toEqual({ refreshToken: 'r1' })
    expect(calls[2].headers.Authorization).toBe('Bearer a2')
    expect(tokens.read()).toEqual({ accessToken: 'a2', refreshToken: 'r2' })
  })

  it('동시에 401 을 받아도 재발급은 한 번만 합니다', async () => {
    const { client, calls } = setup([
      json(401, { code: 'UNAUTHORIZED', message: '만료' }),
      json(401, { code: 'UNAUTHORIZED', message: '만료' }),
      json(200, { accessToken: 'a2', refreshToken: 'r2' }),
      json(200, { n: 1 }),
      json(200, { n: 2 }),
    ])
    await Promise.all([client.request('GET', '/x'), client.request('GET', '/y')])
    expect(calls.filter((call) => call.url.endsWith('/auth/refresh'))).toHaveLength(1)
  })

  it('재발급이 거부되면 토큰을 지우고 만료를 알립니다', async () => {
    const { client, tokens, onExpired } = setup([
      json(401, { code: 'UNAUTHORIZED', message: '만료' }),
      json(401, { code: 'UNAUTHORIZED', message: 'RefreshToken이 유효하지 않거나 만료되었습니다.' }),
    ])
    await expect(client.request('GET', '/bootstrap')).rejects.toMatchObject({ code: 'SESSION_EXPIRED', status: 401 })
    expect(tokens.read()).toBeNull()
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('로그인 요청의 401 은 재발급 없이 서버 메시지를 그대로 전달합니다', async () => {
    const { client, calls, onExpired } = setup([
      json(401, { code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다.' }),
    ])
    await expect(client.request('POST', '/auth/login', { body: {}, auth: false })).rejects.toThrow('아이디 또는 비밀번호')
    expect(calls).toHaveLength(1)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('서버 오류 본문의 메시지를 ApiError 로 전달하고, 연결 실패는 NETWORK 로 구분합니다', async () => {
    const failure = setup([json(400, { code: 'VALIDATION_ERROR', message: '보기를 서로 다르게 입력해 주세요.' })])
    await expect(failure.client.request('PUT', '/cards/1', { body: {} })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '보기를 서로 다르게 입력해 주세요.',
    })

    const offline = setup([new TypeError('Failed to fetch')])
    const error = await offline.client.request('GET', '/bootstrap').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isNetwork).toBe(true)
  })

  it('204 응답은 본문 없이 완료합니다', async () => {
    const { client } = setup([new Response(null, { status: 204 })])
    await expect(client.request('DELETE', '/cards/1')).resolves.toBeUndefined()
  })
})

describe('HTTP StudyApi', () => {
  const entry = { id: 'h1' }

  it('서버가 거부하는 알 수 없는 필드 없이 정해진 필드만 보냅니다', async () => {
    const { client, calls } = setup([json(201, { card: {}, book: {} })])
    await createHttpApi(client).createCard('book-1', {
      type: 'choice',
      question: '질문',
      answer: '',
      explanation: '',
      options: ['a', 'b', 'c', 'd'],
      correct: 2,
      assets: {},
    })
    expect(calls[0].method).toBe('POST')
    expect(calls[0].url).toBe('/api/v1/books/book-1/cards')
    expect(Object.keys(calls[0].body as object).sort()).toEqual(
      ['answer', 'assets', 'correct', 'explanation', 'options', 'question', 'type'],
    )
    expect((calls[0].body as { answer: string }).answer).toBe('c')
  })

  it('잘못된 입력은 서버로 보내기 전에 검증 오류로 막습니다', async () => {
    const { client, calls } = setup([])
    await expect(createHttpApi(client).createBook({ name: ' ', desc: '', icon: '▤', category: '' })).rejects.toThrow('1~60자')
    expect(calls).toHaveLength(0)
  })

  it('평가는 Idempotency-Key 를 보내고, 연결이 끊겨 재시도해도 같은 키를 사용합니다', async () => {
    const { client, calls } = setup([new TypeError('Failed to fetch'), json(200, { card: {}, entry, book: {} })])
    await createHttpApi(client).submitEvaluation({
      bookId: 'b',
      cardId: 'c',
      known: true,
      durationMs: 1234.6,
      revealMs: null,
    })
    expect(calls).toHaveLength(2)
    const key = calls[0].headers['Idempotency-Key']
    expect(key).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[1].headers['Idempotency-Key']).toBe(key)
    expect(calls[1].body).toEqual({ bookId: 'b', cardId: 'c', known: true, durationMs: 1235, revealMs: null })
  })

  it('다른 평가는 새 키를 사용합니다', async () => {
    const { client, calls } = setup([json(200, { entry }), json(200, { entry })])
    const api = createHttpApi(client)
    const payload = { bookId: 'b', cardId: 'c', known: false, durationMs: 1, revealMs: 1 }
    await api.submitEvaluation(payload)
    await api.submitEvaluation(payload)
    expect(calls[0].headers['Idempotency-Key']).not.toBe(calls[1].headers['Idempotency-Key'])
  })
})

describe('HTTP 로그인 API', () => {
  it('로그인하면 토큰을 저장하고 사용자 정보를 돌려줍니다', async () => {
    const tokens = createTokenStore(null)
    const { impl, calls } = fakeFetch([
      json(200, { accessToken: 'a', refreshToken: 'r' }),
      json(200, { username: 'admin' }),
    ])
    const client = createHttpClient({ baseUrl: '/api/v1', tokens, fetchImpl: impl })
    const auth = createHttpAuthApi(client, tokens)
    expect(auth.hasSession()).toBe(false)
    await expect(auth.login('admin', 'admin1234')).resolves.toEqual({ username: 'admin' })
    expect(tokens.read()).toEqual({ accessToken: 'a', refreshToken: 'r' })
    expect(calls[0].headers.Authorization).toBeUndefined()
    expect(calls[1].headers.Authorization).toBe('Bearer a')
  })

  it('로그아웃은 서버 호출이 실패해도 이 기기의 토큰을 지웁니다', async () => {
    const tokens = createTokenStore(null)
    tokens.write({ accessToken: 'a', refreshToken: 'r' })
    const { impl } = fakeFetch([new TypeError('Failed to fetch')])
    const auth = createHttpAuthApi(createHttpClient({ baseUrl: '/api/v1', tokens, fetchImpl: impl }), tokens)
    await auth.logout()
    expect(tokens.read()).toBeNull()
  })

  it('만료된 로그인 정보는 null 로 돌려주고, 서버에 닿지 않으면 오류를 전달합니다', async () => {
    const expired = createTokenStore(null)
    expired.write({ accessToken: 'a', refreshToken: 'r' })
    const first = fakeFetch([
      json(401, { code: 'UNAUTHORIZED', message: '만료' }),
      json(401, { code: 'UNAUTHORIZED', message: '만료' }),
    ])
    const a = createHttpAuthApi(createHttpClient({ baseUrl: '/api/v1', tokens: expired, fetchImpl: first.impl }), expired)
    await expect(a.me()).resolves.toBeNull()

    const offline = createTokenStore(null)
    offline.write({ accessToken: 'a', refreshToken: 'r' })
    const second = fakeFetch([new TypeError('Failed to fetch')])
    const b = createHttpAuthApi(createHttpClient({ baseUrl: '/api/v1', tokens: offline, fetchImpl: second.impl }), offline)
    await expect(b.me()).rejects.toMatchObject({ code: 'NETWORK' })
    expect(offline.read()).not.toBeNull()
  })
})
