import type { AuthApi } from './auth'
import { createHttpApi, createHttpAuthApi } from './http'
import { createHttpClient } from './http/client'
import { createTokenStore } from './http/tokens'
import { createMockApi } from './mock'
import { createMockAuthApi } from './mock/auth'
import { notifySessionExpired } from './session'
import type { StudyApi } from './types'

/**
 * `VITE_API_MODE=http` 이면 서버(`VITE_API_BASE_URL`, 기본 `/api/v1`)를 사용하고,
 * 그 외에는 서버 없이 동작하는 모킹 API 를 사용합니다.
 */
export const apiMode: 'http' | 'mock' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock'

function createDefaults(): { study: StudyApi; auth: AuthApi } {
  if (apiMode === 'mock') return { study: createMockApi(), auth: createMockAuthApi() }
  const tokens = createTokenStore()
  const client = createHttpClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    tokens,
    onExpired: notifySessionExpired,
  })
  return { study: createHttpApi(client), auth: createHttpAuthApi(client, tokens) }
}

const defaults = createDefaults()
let currentStudy: StudyApi = defaults.study
let currentAuth: AuthApi = defaults.auth

/** 화면과 스토어가 사용하는 학습 API 입니다. 구현은 `setApi` 로 교체할 수 있습니다. */
export const api: StudyApi = new Proxy({} as StudyApi, {
  get: (_target, key) => currentStudy[key as keyof StudyApi],
})

/** 로그인 API 입니다. */
export const authApi: AuthApi = new Proxy({} as AuthApi, {
  get: (_target, key) => currentAuth[key as keyof AuthApi],
})

export function setApi(next: StudyApi) {
  currentStudy = next
}

export function setAuthApi(next: AuthApi) {
  currentAuth = next
}

export type { StudyApi } from './types'
export type { AuthApi, AuthUser } from './auth'
