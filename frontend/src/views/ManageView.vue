<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import CardStatsModal from '@/components/CardStatsModal.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { LEVELS, cardTypeLabel } from '@/constants'
import { useConfirm } from '@/composables/useConfirm'
import { useRequiredBook } from '@/composables/useRequiredBook'
import { useBookStore } from '@/stores/books'
import { useHistoryStore } from '@/stores/history'
import { useToastStore } from '@/stores/toast'
import { filterCards, paginate } from '@/utils/cards'
import { formatDuration } from '@/utils/date'

const props = defineProps<{ bookId: string }>()

const route = useRoute()
const router = useRouter()
const books = useBookStore()
const history = useHistoryStore()
const toast = useToastStore()
const { confirm } = useConfirm()
const book = useRequiredBook(() => props.bookId)

/* 검색 조건은 주소의 쿼리에 보관해 새로고침과 뒤로 가기에도 유지합니다. */
const queryParam = computed(() => String(route.query.q ?? '').slice(0, 200))
const levelParam = computed(() => {
  const level = Number(route.query.level)
  return Number.isInteger(level) && level >= 1 && level <= 5 ? level : 0
})
const pageParam = computed(() => Number(route.query.page) || 1)

const queryInput = ref(queryParam.value)
const levelInput = ref(levelParam.value)
watch([queryParam, levelParam], () => {
  queryInput.value = queryParam.value
  levelInput.value = levelParam.value
})

const allCards = computed(() => books.cardsOf(props.bookId))
const filtered = computed(() =>
  filterCards(allCards.value, { query: queryParam.value, level: levelParam.value }),
)
const result = computed(() => paginate(filtered.value, pageParam.value))
const hasFilter = computed(() => !!queryParam.value.trim() || levelParam.value > 0)
const statsCardId = ref<string | null>(null)

function go(query: Record<string, string | number>) {
  void router.push({ path: `/books/${props.bookId}/manage`, query })
}

function buildQuery(page: number) {
  const query: Record<string, string | number> = {}
  if (queryParam.value.trim()) query.q = queryParam.value.trim()
  if (levelParam.value) query.level = levelParam.value
  if (page > 1) query.page = page
  return query
}

function search() {
  const query: Record<string, string | number> = {}
  const text = queryInput.value.trim().slice(0, 200)
  if (text) query.q = text
  if (levelInput.value) query.level = levelInput.value
  go(query)
}

const clear = () => go({})

async function resetLevel(cardId: string) {
  await books.resetCardLevel(cardId)
  toast.push('암기 레벨을 Level 1로 초기화했습니다. 학습 기록은 유지됩니다.')
}

async function remove(cardId: string) {
  const ok = await confirm({
    title: '이 문제를 삭제할까요?',
    message: '삭제한 문제는 복구할 수 없어요. 이전 학습 통계는 유지됩니다.',
    confirmLabel: '삭제',
    danger: true,
  })
  if (!ok) return
  await books.deleteCard(cardId)
  toast.push('문제를 삭제했습니다.')
}

function summary(cardId: string) {
  return history.cardStats(cardId)
}
</script>

<template>
  <template v-if="book">
    <RouterLink class="back" :to="`/books/${book.id}`">← {{ book.name }}</RouterLink>
    <div class="eyebrow">MANAGE YOUR CARDS</div>
    <div class="heading-row">
      <h1>문제 관리</h1>
      <RouterLink class="primary" :to="`/books/${book.id}/cards/new`">＋ 문제 만들기</RouterLink>
    </div>
    <p class="subtitle">등록한 문제와 정답·해설을 확인하고 수정하거나 삭제할 수 있어요.</p>

    <form class="panel management-filters" role="search" @submit.prevent="search">
      <div class="search-field">
        <label for="manage-query">문제 검색</label>
        <input
          id="manage-query"
          v-model="queryInput"
          type="search"
          maxlength="200"
          placeholder="질문, 정답, 해설, 보기에서 찾기"
        >
      </div>
      <div class="level-filter">
        <label for="manage-level">암기 레벨</label>
        <select id="manage-level" v-model.number="levelInput">
          <option :value="0">전체 레벨</option>
          <option v-for="level in LEVELS" :key="level" :value="level">Level {{ level }}</option>
        </select>
      </div>
      <button class="primary" type="submit">검색</button>
      <button v-if="hasFilter" class="filter-clear" type="button" @click="clear">조건 초기화</button>
    </form>

    <p class="management-result" role="status">
      <template v-if="!allCards.length">등록된 문제가 없어요.</template>
      <template v-else-if="!result.total">조건에 맞는 문제가 없어요. 검색어나 레벨을 바꿔 보세요.</template>
      <template v-else>
        총 {{ result.total }}장 중 {{ result.from }}–{{ result.to }}번째를 보고 있어요.
      </template>
    </p>

    <section v-if="!allCards.length" class="panel management-empty">
      <h2>아직 문제가 없어요</h2>
      <p>첫 문제를 만들어 이 문제집에 학습할 내용을 채워 보세요.</p>
      <div class="management-actions">
        <RouterLink class="primary" :to="`/books/${book.id}/cards/new`">＋ 첫 문제 만들기</RouterLink>
      </div>
    </section>

    <div v-else class="question-list">
      <article v-for="card in result.items" :key="card.id" class="panel managed-question">
        <div class="managed-meta">
          <span>{{ cardTypeLabel(card.type) }}</span>
          <span class="pill">Level {{ card.level }}</span>
        </div>
        <MarkdownView class="managed-question-content" :source="card.question" :assets="card.assets" />
        <details>
          <summary>정답·해설 보기</summary>
          <div class="managed-answer">
            <strong>정답</strong>
            <MarkdownView :source="card.answer" :assets="card.assets" />
            <strong>해설</strong>
            <MarkdownView :source="card.explanation || '등록된 해설이 없습니다.'" :assets="card.assets" />
          </div>
        </details>
        <div class="card-stats-summary">
          <span>학습 <strong>{{ summary(card.id).total }}회</strong></span>
          <span>누적 시간 <strong>{{ formatDuration(summary(card.id).totalMs) }}</strong></span>
          <span>알아요 <strong>{{ summary(card.id).ratio == null ? '—' : `${summary(card.id).ratio}%` }}</strong></span>
          <button type="button" class="link-button" @click="statsCardId = card.id">카드 통계 보기 →</button>
        </div>
        <div class="management-actions">
          <RouterLink class="secondary" :to="`/books/${book.id}/cards/${card.id}/edit`">수정</RouterLink>
          <button class="secondary level-reset" type="button" :disabled="card.level === 1" @click="resetLevel(card.id)">
            ↺ 암기 레벨 초기화
          </button>
          <button class="secondary danger-action" type="button" @click="remove(card.id)">삭제</button>
        </div>
      </article>
    </div>

    <nav v-if="result.totalPages > 1" class="pagination" aria-label="문제 목록 페이지">
      <button class="secondary" type="button" :disabled="result.page <= 1" @click="go(buildQuery(result.page - 1))">
        ← 이전
      </button>
      <span>{{ result.page }} / {{ result.totalPages }} 페이지</span>
      <button
        class="secondary"
        type="button"
        :disabled="result.page >= result.totalPages"
        @click="go(buildQuery(result.page + 1))"
      >
        다음 →
      </button>
    </nav>

    <CardStatsModal v-if="statsCardId" :card-id="statsCardId" @close="statsCardId = null" />
  </template>
</template>
