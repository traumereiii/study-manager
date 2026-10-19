import type { AuthApi } from '../auth'

const STORAGE_KEY = 'chagok-vue-mock-auth-v1'

/** 모킹 환경의 로그인 계정. 서버(`admin / admin1234`)와 같습니다. */
export const MOCK_CREDENTIALS = { username: 'admin', password: 'admin1234' } as const

/** 서버 없이 로그인 화면을 확인하기 위한 모킹 구현입니다. */
export function createMockAuthApi(storage: Storage | null = safeLocalStorage()): AuthApi {
  let memory = false

  const signedIn = (): boolean => {
    try {
      return memory || storage?.getItem(STORAGE_KEY) === MOCK_CREDENTIALS.username
    } catch {
      return memory
    }
  }

  return {
    hasSession: signedIn,

    async login(username, password) {
      if (username !== MOCK_CREDENTIALS.username || password !== MOCK_CREDENTIALS.password) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
      }
      memory = true
      try {
        storage?.setItem(STORAGE_KEY, username)
      } catch {
        // 저장할 수 없어도 현재 탭에서는 로그인 상태를 유지합니다.
      }
      return { username }
    },

    async me() {
      return signedIn() ? { username: MOCK_CREDENTIALS.username } : null
    },

    async logout() {
      memory = false
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
