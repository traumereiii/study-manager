import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/api'
import type { AuthUser } from '@/api/auth'
import { useAppStore } from './app'
import { useStudyStore } from './study'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  /** 저장된 로그인 정보를 확인했는지(앱 시작 시 한 번) */
  const restored = ref(false)
  /** 로그인 정보를 확인하다 생긴 문제(서버에 연결하지 못함 등) */
  const restoreError = ref('')
  const authenticated = computed(() => user.value !== null)

  async function restore() {
    if (restored.value) return
    try {
      user.value = authApi.hasSession() ? await authApi.me() : null
    } catch (failure) {
      user.value = null
      restoreError.value = failure instanceof Error ? failure.message : '로그인 상태를 확인하지 못했습니다.'
    } finally {
      restored.value = true
    }
  }

  async function login(username: string, password: string) {
    user.value = await authApi.login(username, password)
    restoreError.value = ''
  }

  /** 서버에서 로그인 세션을 폐기하고 이 기기의 상태를 비웁니다. */
  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clear()
    }
  }

  /** 서버 응답 없이 화면 상태만 로그아웃으로 되돌립니다(세션 만료 등). */
  function clear() {
    user.value = null
    useStudyStore().end()
    useAppStore().reset()
  }

  return { user, restored, restoreError, authenticated, restore, login, logout, clear }
})
