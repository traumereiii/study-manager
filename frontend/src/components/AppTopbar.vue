<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useBookStore } from '@/stores/books'

const route = useRoute()
const books = useBookStore()

const book = computed(() => {
  const id = route.params.bookId
  return typeof id === 'string' ? books.getBook(id) : undefined
})
const title = computed(() => route.meta.title)
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
    <span class="demo-label"><i></i> 미리보기 · 목업 데이터</span>
  </header>
</template>
