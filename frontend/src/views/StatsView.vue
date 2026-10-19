<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useBookStore } from '@/stores/books'
import { useHistoryStore } from '@/stores/history'

const books = useBookStore()
const history = useHistoryStore()

const summary = computed(() => history.summary)
const days = computed(() => history.weekly)
const max = computed(() => Math.max(1, ...days.value.map((day) => day.count)))

const summaryItems = computed(() => [
  { label: '오늘 학습', value: summary.value.today, unit: '회' },
  { label: '누적 학습', value: summary.value.total, unit: '회' },
  { label: '알아요 비율', value: summary.value.ratio, unit: '%' },
  { label: '학습한 날', value: summary.value.activeDays, unit: '일' },
])

const rows = computed(() =>
  books.books
    .filter((book) => !book.deleted)
    .map((book) => {
      const stats = history.bookStats(book.id)
      const count = books.cardsOf(book.id).length
      return {
        book,
        count,
        total: stats.total,
        ratio: stats.ratio,
        average: count ? books.averageLevel(book.id) : null,
      }
    }),
)
</script>

<template>
  <div class="eyebrow">YOUR STEADY PROGRESS</div>
  <h1>학습 통계</h1>
  <p class="subtitle">한 장씩 쌓아 온 학습을 돌아보세요. 반복 평가도 학습 횟수에 포함됩니다.</p>

  <div class="stats-summary">
    <section v-for="item in summaryItems" :key="item.label" class="panel">
      <p class="panel-caption">{{ item.label }}</p>
      <div class="total">{{ item.value }}<span> {{ item.unit }}</span></div>
    </section>
  </div>

  <section class="panel">
    <div class="section-title chart-heading">
      <h2>최근 7일 학습</h2>
      <span>평가 횟수 기준</span>
    </div>
    <div class="weekly-chart">
      <div
        v-for="day in days"
        :key="day.key"
        class="chart-column"
        role="img"
        :aria-label="`${day.label} ${day.count}회`"
      >
        <strong>{{ day.count }}</strong>
        <div class="chart-track"><div class="chart-bar" :style="{ height: `${(day.count / max) * 100}%` }"></div></div>
        <span>{{ day.label }}</span>
      </div>
    </div>
    <p v-if="!summary.total" class="empty-note">
      아직 학습 기록이 없어요. 문제를 풀고 알아요 / 몰라요를 선택하면 통계가 쌓입니다.
    </p>
  </section>

  <section class="panel book-stats">
    <h2>문제집별 학습 현황</h2>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">문제집</th>
            <th scope="col">카드</th>
            <th scope="col">평가 횟수</th>
            <th scope="col">알아요 비율</th>
            <th scope="col">평균 레벨</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.book.id">
            <th scope="row"><RouterLink :to="`/books/${row.book.id}`">{{ row.book.name }}</RouterLink></th>
            <td>{{ row.count }}장</td>
            <td>{{ row.total }}회</td>
            <td>{{ row.ratio == null ? '—' : `${row.ratio}%` }}</td>
            <td>{{ row.average == null ? '—' : `Lv. ${row.average.toFixed(1)}` }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="empty-note">
      같은 카드를 반복 평가해도 매번 횟수에 포함됩니다. 알아요 비율은 자기 평가 기준이며 선다형 정답률이 아닙니다.
    </p>
  </section>
</template>
