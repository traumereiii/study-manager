<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiMode } from '@/api'
import { MOCK_CREDENTIALS } from '@/api/mock/auth'
import { safeRedirect } from '@/router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

const notice = computed(() => {
  if (route.query.reason === 'expired') return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  if (route.query.reason === 'logout') return '로그아웃했습니다.'
  return auth.restoreError
})

async function submit() {
  if (submitting.value) return
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = '아이디와 비밀번호를 입력해 주세요.'
    return
  }
  submitting.value = true
  try {
    await auth.login(username.value.trim(), password.value)
    await router.replace(safeRedirect(route.query.redirect))
  } catch (failure) {
    password.value = ''
    error.value = failure instanceof Error ? failure.message : '로그인하지 못했습니다. 다시 시도해 주세요.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <div class="login-brand"><span class="brand-mark">▰</span> 차곡<span class="brand-dot">.</span></div>
    <form class="panel create-form login-card" novalidate @submit.prevent="submit">
      <div class="eyebrow">WELCOME BACK</div>
      <h1>로그인</h1>
      <p class="subtitle">차곡차곡 쌓아 둔 나의 학습 공간으로 들어가요.</p>

      <p v-if="notice" class="login-notice" role="status">{{ notice }}</p>

      <div class="form-field">
        <label for="login-username">아이디</label>
        <input
          id="login-username"
          v-model="username"
          type="text"
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
          autofocus
          :aria-invalid="!!error"
        >
      </div>
      <div class="form-field">
        <label for="login-password">비밀번호</label>
        <input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          :aria-invalid="!!error"
        >
      </div>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button class="primary login-submit" type="submit" :disabled="submitting">
        {{ submitting ? '로그인 중…' : '로그인' }}
      </button>

      <p v-if="apiMode === 'mock'" class="field-help login-hint">
        미리보기 모드입니다. 아이디 <code>{{ MOCK_CREDENTIALS.username }}</code>,
        비밀번호 <code>{{ MOCK_CREDENTIALS.password }}</code> 로 로그인할 수 있어요.
      </p>
    </form>
  </div>
</template>
