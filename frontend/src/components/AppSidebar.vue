<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useBookStore } from '@/stores/books'

const route = useRoute()
const books = useBookStore()
const current = computed(() => route.meta.nav)
</script>

<template>
  <aside class="sidebar">
    <RouterLink class="brand" to="/books"><span class="brand-mark">▰</span> 차곡<span class="brand-dot">.</span></RouterLink>
    <div class="workspace-label">MY WORKSPACE</div>
    <nav aria-label="주요 메뉴" class="nav">
      <RouterLink
        class="nav-item"
        :class="{ active: current === 'books' }"
        :aria-current="current === 'books' ? 'page' : undefined"
        to="/books"
      >
        <span aria-hidden="true">▤</span> 나의 문제집
        <span class="nav-count">{{ books.activeBooks.length }}</span>
      </RouterLink>
      <RouterLink
        class="nav-item"
        :class="{ active: current === 'stats' }"
        :aria-current="current === 'stats' ? 'page' : undefined"
        to="/stats"
      >
        <span aria-hidden="true">▥</span> 학습 통계
      </RouterLink>
      <RouterLink
        class="nav-item"
        :class="{ active: current === 'settings' }"
        :aria-current="current === 'settings' ? 'page' : undefined"
        to="/settings"
      >
        <span aria-hidden="true">⚙</span> 설정
      </RouterLink>
    </nav>
    <div class="profile">
      <span class="avatar">나</span>
      <div><strong>나의 학습 공간</strong><small>개인 워크스페이스</small></div>
      <span class="profile-dot"></span>
    </div>
  </aside>
</template>
