<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BookIcon from '@/components/BookIcon.vue'
import { LEVEL_COLORS, LEVELS } from '@/constants'
import { useConfirm } from '@/composables/useConfirm'
import { useRequiredBook } from '@/composables/useRequiredBook'
import { useBookStore } from '@/stores/books'
import { useStudyStore } from '@/stores/study'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ bookId: string }>()

const router = useRouter()
const books = useBookStore()
const study = useStudyStore()
const toast = useToastStore()
const { confirm } = useConfirm()
const book = useRequiredBook(() => props.bookId)

const cards = computed(() => books.cardsOf(props.bookId))
const counts = computed(() => books.levelCounts(props.bookId))
const due = computed(() => books.dueCount(props.bookId))

function startStudy() {
  if (study.start(props.bookId)) void router.push(`/books/${props.bookId}/study`)
}

async function toggleArchive() {
  if (!book.value) return
  const archived = !book.value.archived
  await books.setBookState(book.value.id, { archived })
  toast.push(archived ? '문제집을 보관함으로 옮겼습니다.' : '문제집을 학습 중으로 되돌렸습니다.')
}

async function remove() {
  if (!book.value) return
  const name = book.value.name
  const ok = await confirm({
    title: '문제집을 삭제할까요?',
    message: `'${name}'은 삭제된 문제집 목록으로 이동하며, 거기에서 복원할 수 있어요.`,
    confirmLabel: '삭제',
    danger: true,
  })
  if (!ok) return
  await books.setBookState(props.bookId, { deleted: true })
  toast.push(`'${name}' 문제집을 삭제했습니다. 삭제된 문제집에서 복원할 수 있어요.`)
  await router.push('/books')
}
</script>

<template>
  <template v-if="book">
    <RouterLink class="back" to="/books">← 나의 문제집</RouterLink>
    <div class="eyebrow">BOOK OVERVIEW</div>
    <div class="heading-row">
      <div class="title-with-icon"><BookIcon :book="book" /><h1>{{ book.name }}</h1></div>
      <div class="management-actions">
        <RouterLink class="secondary" :to="`/books/${book.id}/edit`">문제집 수정</RouterLink>
        <RouterLink class="secondary" :to="`/books/${book.id}/manage`">문제 관리</RouterLink>
        <RouterLink class="secondary" :to="`/books/${book.id}/cards/new`">＋ 문제 만들기</RouterLink>
        <button class="secondary" type="button" @click="toggleArchive">
          {{ book.archived ? '보관 해제' : '보관하기' }}
        </button>
        <button class="secondary danger-action" type="button" @click="remove">삭제</button>
      </div>
    </div>
    <p class="subtitle">
      <span v-if="book.category" class="category-tag">{{ book.category }}</span>
      {{ book.desc }}
    </p>

    <div class="detail-grid">
      <section class="panel">
        <h2>암기 현황</h2>
        <p class="panel-caption">레벨을 선택하면 해당 문제를 모아 볼 수 있어요.</p>
        <div class="total">{{ cards.length }}<span> 장의 카드</span></div>
        <RouterLink
          v-for="(level, index) in LEVELS"
          :key="level"
          class="level-row level-link"
          :to="{ path: `/books/${book.id}/manage`, query: { level } }"
          :aria-label="`Level ${level} 문제 ${counts[index]}장 보기`"
        >
          <span>Level {{ level }}</span>
          <div class="track">
            <div :style="{ width: `${(counts[index] / (cards.length || 1)) * 100}%`, '--bar': LEVEL_COLORS[index] }"></div>
          </div>
          <strong>{{ counts[index] }}장 <span aria-hidden="true">→</span></strong>
        </RouterLink>
        <p class="empty-note">처음 배우는 단계 · Level 1 → 충분히 기억하는 단계 · Level 5</p>
      </section>

      <section class="panel study-plan">
        <span class="seed" aria-hidden="true">✳</span>
        <template v-if="cards.length">
          <h2>오늘의 작은 한 걸음</h2>
          <div class="total">{{ due }}<span> 장 학습 예정</span></div>
          <p class="panel-caption">
            문제를 읽고 답을 떠올려 보세요.<br>정답을 확인한 뒤, 얼마나 기억했는지<br>솔직하게 평가하면 돼요.
          </p>
          <button class="primary" type="button" @click="startStudy">
            {{ due ? '학습하기' : '한 번 더 학습하기' }} <span aria-hidden="true">→</span>
          </button>
          <div class="empty-note">카드 {{ cards.length }}장으로 학습을 시작합니다.</div>
        </template>
        <template v-else>
          <h2>첫 문제를 만들어 보세요</h2>
          <p class="panel-caption">
            아직 카드가 없는 문제집이에요.<br>기억하고 싶은 질문과 정답을 추가해 보세요.
          </p>
          <RouterLink class="primary" :to="`/books/${book.id}/cards/new`">＋ 첫 문제 만들기</RouterLink>
        </template>
      </section>
    </div>
  </template>
</template>
