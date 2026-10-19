export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface TokenStore {
  read(): TokenPair | null
  write(tokens: TokenPair): void
  clear(): void
}

const STORAGE_KEY = 'chagok-auth-v1'

/**
 * 토큰을 localStorage 에 보관해 새로고침 후에도 로그인을 유지합니다.
 * 저장소를 쓸 수 없으면(개인정보 보호 모드 등) 메모리에만 보관합니다.
 */
export function createTokenStore(storage: Storage | null = safeLocalStorage()): TokenStore {
  let memory: TokenPair | null = null

  const parse = (raw: string | null): TokenPair | null => {
    if (!raw) return null
    try {
      const value = JSON.parse(raw) as Partial<TokenPair>
      return typeof value.accessToken === 'string' && typeof value.refreshToken === 'string'
        ? { accessToken: value.accessToken, refreshToken: value.refreshToken }
        : null
    } catch {
      return null
    }
  }

  return {
    read() {
      // 다른 탭이 토큰을 재발급했을 수 있으므로 저장소의 값을 우선합니다.
      try {
        return parse(storage?.getItem(STORAGE_KEY) ?? null) ?? memory
      } catch {
        return memory
      }
    },
    write(tokens) {
      memory = tokens
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(tokens))
      } catch {
        // 저장 공간을 쓸 수 없어도 현재 탭에서는 로그인 상태를 유지합니다.
      }
    },
    clear() {
      memory = null
      try {
        storage?.removeItem(STORAGE_KEY)
      } catch {
        // 지울 수 없는 경우는 무시합니다.
      }
    },
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
