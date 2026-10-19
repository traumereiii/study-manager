import type { Book, Card } from '@/types'
import { newUuid } from '@/utils/uuid'
import { validateBookInput, validateCardInput, validateSettings } from '@/utils/validation'
import type { AuthApi } from '../auth'
import type { BootstrapData, EvaluationResult, StudyApi } from '../types'
import { ApiError, type HttpClient } from './client'
import type { TokenStore } from './tokens'

type CardResult = { card: Card; book: Book }

/**
 * 서버(`/api/v1`)를 호출하는 StudyApi 구현입니다.
 * 입력은 서버와 같은 규칙으로 먼저 검사해 불필요한 왕복을 줄이고,
 * 서버는 알 수 없는 필드를 거부하므로 요청 본문은 필드를 명시해 만듭니다.
 */
export function createHttpApi(client: HttpClient): StudyApi {
  const cardBody = (input: Parameters<StudyApi['createCard']>[1]) => {
    const value = validateCardInput(input)
    return {
      type: value.type,
      question: value.question,
      answer: value.answer,
      explanation: value.explanation,
      options: value.options,
      correct: value.correct,
      assets: value.assets,
    }
  }

  return {
    bootstrap: () => client.request<BootstrapData>('GET', '/bootstrap'),

    async createBook(input) {
      return client.request<Book>('POST', '/books', { body: validateBookInput(input) })
    },
    async updateBook(id, input) {
      return client.request<Book>('PUT', `/books/${encodeURIComponent(id)}`, { body: validateBookInput(input) })
    },
    setBookState: (id, state) =>
      client.request<Book>('PATCH', `/books/${encodeURIComponent(id)}/state`, {
        body: { archived: state.archived, deleted: state.deleted },
      }),
    purgeBook: (id) => client.request('DELETE', `/books/${encodeURIComponent(id)}`),

    async createCard(bookId, input) {
      return client.request<CardResult>('POST', `/books/${encodeURIComponent(bookId)}/cards`, { body: cardBody(input) })
    },
    async updateCard(id, input) {
      return client.request<CardResult>('PUT', `/cards/${encodeURIComponent(id)}`, { body: cardBody(input) })
    },
    deleteCard: (id) => client.request('DELETE', `/cards/${encodeURIComponent(id)}`),
    resetCardLevel: (id) => client.request<CardResult>('POST', `/cards/${encodeURIComponent(id)}/level-reset`),

    async submitEvaluation(payload) {
      // 응답을 받지 못해 재시도해도 레벨과 이력이 중복 반영되지 않도록 같은 키를 사용합니다.
      const key = newUuid()
      const send = () =>
        client.request<EvaluationResult>('POST', '/evaluations', {
          headers: { 'Idempotency-Key': key },
          body: {
            bookId: payload.bookId,
            cardId: payload.cardId,
            known: payload.known,
            durationMs: Math.max(0, Math.round(payload.durationMs)),
            revealMs: payload.revealMs == null ? null : Math.max(0, Math.round(payload.revealMs)),
          },
        })
      try {
        return await send()
      } catch (failure) {
        if (failure instanceof ApiError && failure.isNetwork) return send()
        throw failure
      }
    },
    completeBook: (bookId) => client.request<Book>('POST', `/books/${encodeURIComponent(bookId)}/completion`),

    async saveSettings(settings) {
      const value = validateSettings(settings)
      return client.request('PUT', '/settings', {
        body: {
          shortcuts: value.shortcuts,
          reveal: value.reveal,
          unknown: value.unknown,
          known: value.known,
          alarm: value.alarm,
          alarmTime: value.alarmTime,
          timeLimit: value.timeLimit,
        },
      })
    },
    setAlarmLastDate: (date) => client.request('PUT', '/settings/alarm-last-date', { body: { date } }),
  }
}

export function createHttpAuthApi(client: HttpClient, tokens: TokenStore): AuthApi {
  return {
    hasSession: () => tokens.read() !== null,

    async login(username, password) {
      const pair = await client.request<{ accessToken: string; refreshToken: string }>('POST', '/auth/login', {
        body: { username, password },
        auth: false,
      })
      tokens.write({ accessToken: pair.accessToken, refreshToken: pair.refreshToken })
      return client.request<{ username: string }>('GET', '/auth/me')
    },

    async me() {
      try {
        return await client.request<{ username: string }>('GET', '/auth/me')
      } catch (failure) {
        // 로그인이 만료됐으면 로그인 화면으로 보내고, 서버에 닿지 않은 경우는 그대로 알립니다.
        if (failure instanceof ApiError && failure.status === 401) return null
        throw failure
      }
    },

    async logout() {
      try {
        await client.request('POST', '/auth/logout')
      } catch {
        // 서버에서 폐기하지 못해도 이 기기의 로그인 정보는 지웁니다.
      } finally {
        tokens.clear()
      }
    },
  }
}
