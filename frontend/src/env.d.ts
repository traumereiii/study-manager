/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `http` 이면 서버 API, 그 외에는 모킹 API */
  readonly VITE_API_MODE?: string
  /** 서버 API 기준 경로. 기본값 `/api/v1` */
  readonly VITE_API_BASE_URL?: string
  /** 개발 서버가 `/api` 를 넘겨줄 서버 주소(vite.config.ts 에서 사용) */
  readonly VITE_PROXY_TARGET?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
