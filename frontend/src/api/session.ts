type Listener = () => void

let listener: Listener | null = null

/** 로그인 정보를 갱신할 수 없게 됐을 때(재발급 실패) 호출할 함수를 등록합니다. */
export function onSessionExpired(next: Listener | null) {
  listener = next
}

export function notifySessionExpired() {
  listener?.()
}
