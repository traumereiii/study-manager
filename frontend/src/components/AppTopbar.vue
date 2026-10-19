<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { apiMode } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useBookStore } from '@/stores/books'

const route = useRoute()
const router = useRouter()
const books = useBookStore()
const auth = useAuthStore()

const book = computed(() => {
  const id = route.params.bookId
  return typeof id === 'string' ? books.getBook(id) : undefined
})
const title = computed(() => route.meta.title)

async function logout() {
  await auth.logout()
  await router.replace({ name: 'login', query: { reason: 'logout' } })
}
</script>

<template>
  <header class="topbar">
    <nav class="breadcrumb" aria-label="현재 위치">
      워크스페이스 <span aria-hidden="true">/</span>
      <RouterLink to="/books">나의 문제집</RouterLink>
      <template v-if="book">
        <span aria-hidden="true">/</span>
        <RouterLink v-if="title" :to="`/books/${book.id}`">{{ book.name }}</RouterLink>
        <template v-else>{{ book.name }}</template>
      </template>
      <template v-if="title">
        <span aria-hidden="true">/</span> {{ title }}
      </template>
    </nav>
    <div class="topbar-actions">
      <span v-if="apiMode === 'mock'" class="demo-label"><i></i> 미리보기 · 목업 데이터</span>
      <span v-if="auth.user" class="topbar-user">{{ auth.user.username }}</span>
      <button class="secondary topbar-logout" type="button" @click="logout">로그아웃</button>
    </div>
  </header>
</template>
