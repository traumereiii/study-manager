import type { TokenStore } from './tokens'

/** 서버가 돌려준 오류(`{ code, message }`) 또는 네트워크 오류 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isNetwork(): boolean {
    return this.code === 'NETWORK'
  }
}

export interface RequestOptions {
  body?: unknown
  headers?: Record<string, string>
  /** false 면 로그인·재발급처럼 Authorization 헤더를 붙이지 않습니다. */
  auth?: boolean
}

export interface HttpClient {
  request<T = void>(method: string, path: string, options?: RequestOptions): Promise<T>
}

export interface HttpClientOptions {
  baseUrl: string
  tokens: TokenStore
  /** 재발급까지 실패해 다시 로그인해야 할 때 호출합니다. */
  onExpired?: () => void
  fetchImpl?: typeof fetch
}

interface TokenResponse {
  accessToken: string
  refreshToken: string
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const { tokens, onExpired } = options
  const baseUrl = options.baseUrl.replace(/\/+$/, '')
  const doFetch = options.fetchImpl ?? ((input, init) => fetch(input, init))

  async function send(method: string, path: string, request: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json', ...request.headers }
    if (request.body !== undefined) headers['Content-Type'] = 'application/json'
    if (request.auth !== false) {
      const current = tokens.read()
      if (current) headers.Authorization = `Bearer ${current.accessToken}`
    }
    try {
      return await doFetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      })
    } catch {
      throw new ApiError('서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.', 0, 'NETWORK')
    }
  }

  // 동시에 여러 요청이 401 을 받아도 재발급은 한 번만 하고, 회전된 토큰을 함께 씁니다.
  let refreshing: Promise<boolean> | null = null

  function refresh(): Promise<boolean> {
    refreshing ??= doRefresh().finally(() => {
      refreshing = null
    })
    return refreshing
  }

  async function doRefresh(): Promise<boolean> {
    const current = tokens.read()
    if (!current) return false
    // 만료된 AccessToken 헤더를 붙이지 않습니다.
    const response = await send('POST', '/auth/refresh', {
      body: { refreshToken: current.refreshToken },
      auth: false,
    })
    if (response.ok) {
      const next = (await response.json()) as TokenResponse
      tokens.write({ accessToken: next.accessToken, refreshToken: next.refreshToken })
      return true
    }
    if (response.status >= 500) throw await toApiError(response)
    // 만료·폐기·재사용된 RefreshToken 이므로 다시 로그인해야 합니다.
    tokens.clear()
    return false
  }

  async function request<T>(method: string, path: string, request: RequestOptions = {}): Promise<T> {
    let response = await send(method, path, request)
    if (response.status === 401 && request.auth !== false && tokens.read()) {
      if (await refresh()) {
        response = await send(method, path, request)
      } else {
        onExpired?.()
        throw new ApiError('로그인이 만료되었습니다. 다시 로그인해 주세요.', 401, 'SESSION_EXPIRED')
      }
    }
    if (!response.ok) throw await toApiError(response)
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return { request }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { code?: string; message?: string }
    if (body.message) return new ApiError(body.message, response.status, body.code ?? 'ERROR')
  } catch {
    // 본문이 JSON 이 아니면 아래의 기본 메시지를 사용합니다.
  }
  const message =
    response.status === 413
      ? '보내는 데이터가 너무 큽니다. 이미지 크기를 줄여 주세요.'
      : response.status >= 500
        ? '서버에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.'
        : '요청을 처리하지 못했습니다.'
  return new ApiError(message, response.status, 'ERROR')
}
