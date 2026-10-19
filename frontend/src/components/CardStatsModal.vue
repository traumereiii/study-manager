<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { cardTypeLabel } from '@/constants'
import { useBookStore } from '@/stores/books'
import { useHistoryStore } from '@/stores/history'
import { formatDuration } from '@/utils/date'
import MarkdownView from './MarkdownView.vue'

const props = defineProps<{ cardId: string }>()
const emit = defineEmits<{ close: [] }>()

const books = useBookStore()
const history = useHistoryStore()
const dialog = ref<HTMLElement | null>(null)
let opener: HTMLElement | null = null

const card = computed(() => books.getCard(props.cardId))
const book = computed(() => (card.value ? books.getBook(card.value.bookId) : undefined))
const stats = computed(() => history.cardStats(props.cardId))
const rows = computed(() => stats.value.entries.slice().reverse())

const time = (value: number | null) => formatDuration(value)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  opener = document.activeElement as HTMLElement | null
  document.addEventListener('keydown', onKeydown)
  dialog.value?.focus()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (opener?.isConnected) opener.focus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="card && book" class="modal-backdrop" @click.self="emit('close')">
      <div
        ref="dialog"
        class="modal panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-stats-title"
        tabindex="-1"
      >
        <div class="modal-head">
          <div>
            <div class="eyebrow">CARD STATISTICS</div>
            <h2 id="card-stats-title">카드 학습 통계</h2>
            <p class="panel-caption">{{ book.name }} · {{ cardTypeLabel(card.type) }} · Level {{ card.level }}</p>
          </div>
          <button type="button" class="secondary" @click="emit('close')">닫기</button>
        </div>

        <MarkdownView class="card-stat-question" :source="card.question" :assets="card.assets" />

        <div class="stats-summary card-stat-grid">
          <section class="panel"><p class="panel-caption">학습 횟수</p><strong class="card-stat-value">{{ stats.total }}회</strong></section>
          <section class="panel"><p class="panel-caption">알아요 비율</p><strong class="card-stat-value">{{ stats.ratio == null ? '—' : `${stats.ratio}%` }}</strong></section>
          <section class="panel"><p class="panel-caption">누적 학습 시간</p><strong class="card-stat-value">{{ formatDuration(stats.totalMs) }}</strong></section>
          <section class="panel"><p class="panel-caption">평균 학습 시간</p><strong class="card-stat-value">{{ formatDuration(stats.averageMs) }}</strong></section>
        </div>

        <h3>학습 이력</h3>
        <p class="panel-caption">
          알아요 {{ stats.known }}회 · 몰라요 {{ stats.unknown }}회 · 마지막 학습 {{ stats.last ? stats.last.date : '아직 없음' }}
        </p>
        <div v-if="stats.total" class="table-scroll history-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">학습 시각</th>
                <th scope="col">정답 확인까지</th>
                <th scope="col">평가까지 총 시간</th>
                <th scope="col">평가</th>
                <th scope="col">평가 후 레벨</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in rows" :key="entry.id">
                <td>{{ new Date(entry.at).toLocaleString('ko-KR') }}</td>
                <td>{{ time(entry.revealMs) }}</td>
                <td>{{ time(entry.durationMs) }}</td>
                <td>{{ entry.known ? '알아요' : '몰라요' }}</td>
                <td>Lv. {{ entry.levelAfter }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-note">아직 이 카드의 학습 기록이 없어요. 학습 화면에서 평가하면 기록됩니다.</p>
        <p class="field-help">편집·다른 화면·백그라운드 시간은 학습 시간에서 제외합니다.</p>
      </div>
    </div>
  </Teleport>
</template>
