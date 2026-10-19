<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useBookStore } from '@/stores/books'
import type { Book } from '@/types'
import { shortDate } from '@/utils/date'
import BookIcon from './BookIcon.vue'

const props = defineProps<{ book: Book }>()
const books = useBookStore()

const count = computed(() => books.cardsOf(props.book.id).length)
const due = computed(() => books.dueCount(props.book.id))
const average = computed(() => books.averageLevel(props.book.id))
const status = computed(() => {
  if (props.book.archived) return '보관됨'
  if (!count.value) return '첫 문제를 추가해요'
  return due.value ? '학습을 기다려요' : '오늘 학습 완료'
})
</script>

<template>
  <RouterLink class="book-card" :to="`/books/${book.id}`" :aria-label="`${book.name} 상세 보기`">
    <div class="book-top">
      <BookIcon :book="book" />
      <span class="pill">{{ status }}</span>
    </div>
    <h3>{{ book.name }}</h3>
    <span v-if="book.category" class="category-tag">{{ book.category }}</span>
    <p class="book-desc">{{ book.desc }}</p>
    <div class="book-metrics">
      <div class="metric"><small>전체 카드</small><strong>{{ count }}<span>장</span></strong></div>
      <div class="metric accent"><small>오늘 학습</small><strong>{{ due }}<span>장</span></strong></div>
    </div>
    <div class="level-line">
      <span>평균 암기 레벨</span>
      <strong>Lv. {{ average.toFixed(1) }} <span>/ 5</span></strong>
    </div>
    <div class="track" aria-hidden="true"><div :style="{ width: `${average * 20}%` }"></div></div>
    <div class="card-bottom">
      <span>최근 학습 <span>{{ book.lastStudy ? shortDate(book.lastStudy) : '아직 학습 전' }}</span></span>
      <span class="arrow" aria-hidden="true">↗</span>
    </div>
  </RouterLink>
</template>
