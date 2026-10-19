import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { onSessionExpired } from './api/session'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { useToastStore } from './stores/toast'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/pages.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

const auth = useAuthStore()
const toast = useToastStore()

// 서버 호출이 실패해도 화면이 조용히 멈추지 않도록 처리하지 못한 오류는 알림으로 보여 줍니다.
const reportFailure = (failure: unknown) => {
  toast.push(failure instanceof Error ? failure.message : '요청을 처리하지 못했습니다.', 'error')
}
app.config.errorHandler = (failure) => reportFailure(failure)
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault()
  reportFailure(event.reason)
})

// 로그인 정보를 갱신할 수 없게 되면 로그인 화면으로 보냅니다.
// 앱 시작 시 저장된 로그인 정보를 확인하는 중에는 라우터 가드가 직접 처리합니다.
onSessionExpired(() => {
  if (!auth.authenticated) return
  const redirect = router.currentRoute.value.fullPath
  auth.clear()
  void router.replace({ name: 'login', query: { redirect, reason: 'expired' } })
})

// 로그인 확인과 첫 데이터 로딩이 끝난 뒤 마운트해 빈 화면이 깜빡이지 않게 합니다.
void router.isReady().finally(() => app.mount('#app'))
