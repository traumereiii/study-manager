import { createMockApi } from './mock'
import type { StudyApi } from './types'

let current: StudyApi = createMockApi()

/**
 * 화면과 스토어가 사용하는 API 입니다. 현재는 모킹 구현만 제공하며,
 * 서버가 준비되면 `setApi` 로 HTTP 클라이언트를 주입하면 됩니다.
 */
export const api: StudyApi = new Proxy({} as StudyApi, {
  get: (_target, key) => current[key as keyof StudyApi],
})

export function setApi(next: StudyApi) {
  current = next
}

export type { StudyApi } from './types'
