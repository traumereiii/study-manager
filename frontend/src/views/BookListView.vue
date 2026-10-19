<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BookCard from '@/components/BookCard.vue'
import BookIcon from '@/components/BookIcon.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useBookStore } from '@/stores/books'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const books = useBookStore()
const toast = useToastStore()
const { confirm } = useConfirm()

type Tab = 'active' | 'archived' | 'deleted'
const tab = computed<Tab>(() => {
  const value = route.query.tab
  return value === 'archived' || value === 'deleted' ? value : 'active'
})

const visibleBooks = computed(() =>
  tab.value === 'deleted' ? books.deletedBooks : tab.value === 'archived' ? books.archivedBooks : books.activeBooks,
)

const totalDue = computed(() => books.books.reduce((sum, book) => sum + books.dueCount(book.id), 0))

const emptyMessage = computed(() =>
  tab.value === 'deleted'
    ? '삭제된 문제집이 없어요.'
    : tab.value === 'archived'
      ? '보관한 문제집이 없어요. 문제집 상세 화면에서 보관할 수 있어요.'
      : '학습 중인 문제집이 없어요. 새 문제집을 만들거나 보관함에서 복원해 보세요.',
)

async function restore(id: string, name: string) {
  await books.setBookState(id, { deleted: false })
  toast.push(`'${name}' 문제집을 복원했습니다.`)
}

async function purge(id: string, name: string) {
  const ok = await confirm({
    title: '문제집을 완전히 삭제할까요?',
    message: `'${name}'과 모든 문제, 학습 기록이 사라지며 복구할 수 없어요.`,
    confirmLabel: '완전 삭제',
    danger: true,
  })
  if (!ok) return
  await books.purgeBook(id)
  toast.push(`'${name}' 문제집을 완전히 삭제했습니다.`)
}
</script>

<template>
  <div class="eyebrow">YOUR LEARNING SPACE</div>
  <div class="heading-row">
    <h1>나의 문제집</h1>
    <RouterLink class="primary" to="/books/new">＋ 문제집 만들기</RouterLink>
  </div>
  <p class="subtitle">배운 것을 오래 기억하는 가장 좋은 습관, 오늘도 한 장씩 시작해 보세요.</p>

  <section class="hero">
    <div>
      <div class="hero-tag">A LITTLE EVERY DAY</div>
      <h2 v-if="totalDue">오늘, {{ totalDue }}장의 지식을<br>내 것으로 만들어 볼까요?</h2>
      <h2 v-else>오늘의 학습을 모두 마쳤어요.<br>꾸준함이 실력이 되고 있어요.</h2>
      <p>완벽하지 않아도 괜찮아요. 조금씩 쌓아가면 되니까요.</p>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="art-card one"></div>
      <div class="art-card two"></div>
      <div class="art-card three"><span>✓</span><i></i><i></i></div>
      <span class="spark">✧</span>
    </div>
  </section>

  <nav class="book-tabs" aria-label="문제집 보관 상태">
    <RouterLink to="/books" :aria-current="tab === 'active' ? 'page' : undefined" :class="{ selected: tab === 'active' }">
      학습 중 <span>{{ books.activeBooks.length }}</span>
    </RouterLink>
    <RouterLink to="/books?tab=archived" :aria-current="tab === 'archived' ? 'page' : undefined" :class="{ selected: tab === 'archived' }">
      보관함 <span>{{ books.archivedBooks.length }}</span>
    </RouterLink>
    <RouterLink to="/books?tab=deleted" :aria-current="tab === 'deleted' ? 'page' : undefined" :class="{ selected: tab === 'deleted' }">
      삭제된 문제집 <span>{{ books.deletedBooks.length }}</span>
    </RouterLink>
  </nav>

  <div class="book-grid">
    <template v-if="tab === 'deleted'">
      <article v-for="book in visibleBooks" :key="book.id" class="book-card deleted-card">
        <div class="book-top"><BookIcon :book="book" /><span class="pill">삭제됨</span></div>
        <h3>{{ book.name }}</h3>
        <p class="book-desc">{{ book.desc }}</p>
        <p class="field-help">카드 {{ books.cardsOf(book.id).length }}장 · 완전 삭제하면 복구할 수 없어요.</p>
        <div class="management-actions">
          <button class="secondary" type="button" @click="restore(book.id, book.name)">복원</button>
          <button class="secondary danger-action" type="button" @click="purge(book.id, book.name)">완전 삭제</button>
        </div>
      </article>
    </template>
    <template v-else>
      <BookCard v-for="book in visibleBooks" :key="book.id" :book="book" />
    </template>
    <p v-if="!visibleBooks.length" class="empty-note">{{ emptyMessage }}</p>
  </div>

  <p class="tip">
    <span aria-hidden="true">☼</span>
    <span>암기 레벨이 높을수록 더 잘 기억하고 있는 카드예요. 문제집을 선택해 나의 학습 현황을 확인해 보세요.</span>
  </p>
</template>
