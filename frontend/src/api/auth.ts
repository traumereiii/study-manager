export interface AuthUser {
  username: string
}

/**
 * 로그인 계약입니다. 모킹과 HTTP 구현이 같은 인터페이스를 제공하므로
 * 화면과 스토어는 어느 쪽을 쓰는지 알 필요가 없습니다.
 */
export interface AuthApi {
  /** 저장된 로그인 정보가 있는지(서버 확인 전) */
  hasSession(): boolean
  login(username: string, password: string): Promise<AuthUser>
  /** 저장된 로그인 정보가 유효하면 사용자를, 아니면 null 을 돌려줍니다. */
  me(): Promise<AuthUser | null>
  logout(): Promise<void>
}
