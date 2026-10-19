<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import CardStatsModal from '@/components/CardStatsModal.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { cardTypeLabel, keyLabel } from '@/constants'
import { useBookStore } from '@/stores/books'
import { useSettingsStore } from '@/stores/settings'
import { useStudyStore } from '@/stores/study'
import { useToastStore } from '@/stores/toast'
import { formatDuration } from '@/utils/date'

const props = defineProps<{ bookId: string }>()

const router = useRouter()
const books = useBookStore()
const study = useStudyStore()
const toast = useToastStore()
const settingsStore = useSettingsStore()

const shell = ref<HTMLElement | null>(null)
const now = ref(Date.now())
const busy = ref(false)
const statsOpen = ref(false)
let ticker: ReturnType<typeof setInterval> | undefined

const session = computed(() => study.session)
const book = computed(() => books.getBook(props.bookId))
const card = computed(() => study.card)
const settings = computed(() => settingsStore.settings)

const remainingSeconds = computed(() => {
  const deadline = session.value?.deadline
  return deadline == null ? null : Math.max(0, Math.ceil((deadline - now.value) / 1000))
})

const elapsedText = computed(() => formatDuration(study.elapsed(now.value)))

const shortcutText = computed(() =>
  settings.value.shortcuts
    ? `정답 확인 ${keyLabel(settings.value.reveal)} · 몰라요 ${keyLabel(settings.value.unknown)} · 알아요 ${keyLabel(settings.value.known)}`
    : '단축키 사용 안 함',
)

const timerText = computed(() => {
  if (session.value?.timedOut) return '시간 종료 · 정답을 확인해 주세요.'
  if (remainingSeconds.value != null && !session.value?.revealed) return `남은 시간 ${remainingSeconds.value}초`
  return '천천히 학습해 보세요.'
})

const knownCount = computed(() => session.value?.known ?? 0)

function focusShell() {
  void nextTick(() => shell.value?.focus())
}

function reveal() {
  study.reveal()
  focusShell()
}

async function evaluate(known: boolean) {
  if (busy.value || !session.value?.revealed) return
  busy.value = true
  try {
    await study.evaluate(known)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    focusShell()
  } finally {
    busy.value = false
  }
}

async function resetLevel() {
  if (!card.value) return
  await books.resetCardLevel(card.value.id)
  toast.push('이 문제의 암기 레벨을 Level 1로 초기화했습니다.')
}

function armCurrentCard() {
  study.resumeClock()
  study.armTimer(settings.value.timeLimit)
}

function onVisibility() {
  if (document.hidden) study.pauseClock()
  else study.resumeClock()
}

function onKeydown(event: KeyboardEvent) {
  if (!settings.value.shortcuts || !session.value || study.finished) return
  if (event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (target?.closest('button, a') && [' ', 'Enter'].includes(event.key)) return
  const key = event.key === ' ' ? 'Space' : event.key.length > 1 ? event.key : event.key.toLowerCase()
  const s = settings.value
  if (key === s.reveal && !session.value.revealed) {
    event.preventDefault()
    reveal()
  } else if (session.value.revealed && key === s.unknown) {
    event.preventDefault()
    void evaluate(false)
  } else if (session.value.revealed && key === s.known) {
    event.preventDefault()
    void evaluate(true)
  }
}

onMounted(() => {
  // 진행 중인 세션이 없으면(새로고침 등) 문제집 상세로 돌아갑니다.
  if (!session.value || session.value.bookId !== props.bookId) {
    void router.replace(`/books/${props.bookId}`)
    return
  }
  armCurrentCard()
  ticker = setInterval(() => {
    now.value = Date.now()
    const deadline = session.value?.deadline
    if (deadline != null && !session.value?.revealed && now.value >= deadline) {
      study.reveal({ timedOut: true })
    }
  }, 250)
  document.addEventListener('visibilitychange', onVisibility)
  document.addEventListener('keydown', onKeydown)
  shell.value?.focus()
})

onBeforeUnmount(() => {
  clearInterval(ticker)
  document.removeEventListener('visibilitychange', onVisibility)
  document.removeEventListener('keydown', onKeydown)
  // 수정 화면 등으로 이동하면 시간과 제한시간을 멈추고, 돌아오면 이어서 진행합니다.
  study.pauseClock()
  study.suspendTimer()
})

// 다음 카드로 넘어가면 시간 측정과 제한시간을 새로 시작합니다.
watch(
  () => session.value?.index,
  () => {
    if (session.value && !study.finished) armCurrentCard()
  },
)
</script>

<template>
  <div v-if="session && book" ref="shell" class="study-shell" tabindex="-1">
    <!-- 완료 -->
    <template v-if="study.finished">
      <RouterLink class="back" :to="`/books/${book.id}`">← {{ book.name }}</RouterLink>
      <section class="panel complete">
        <span class="seed" aria-hidden="true">✳</span>
        <div class="eyebrow">ONE STEP FORWARD</div>
        <h2>오늘도 차곡차곡 쌓았어요!</h2>
        <p>
          {{ book.name }}의 {{ study.total }}장을 모두 학습했어요.<br>
          기억이 나지 않은 카드도, 다시 만나면 더 익숙해질 거예요.
        </p>
        <div class="result-row">
          <div><strong>{{ knownCount }}</strong><span>알아요</span></div>
          <div><strong>{{ study.total - knownCount }}</strong><span>몰라요</span></div>
        </div>
        <RouterLink class="primary" :to="`/books/${book.id}`">암기 현황 확인하기 →</RouterLink>
      </section>
    </template>

    <!-- 진행 -->
    <template v-else-if="card">
      <RouterLink class="back" :to="`/books/${book.id}`">← 학습 나가기</RouterLink>
      <div class="eyebrow">FOCUS ON ONE CARD</div>
      <h1>{{ book.name }}</h1>
      <div class="study-meta">
        <span>한 장씩, 천천히 떠올려 보세요.</span>
        <span><strong>{{ session.index + 1 }}</strong> / {{ study.total }}</span>
      </div>
      <div
        class="track"
        role="progressbar"
        aria-label="학습 진행률"
        aria-valuemin="0"
        :aria-valuemax="study.total"
        :aria-valuenow="session.index"
      >
        <div :style="{ width: `${(session.index / study.total) * 100}%` }"></div>
      </div>

      <section class="panel question-panel">
        <div class="question-label">
          QUESTION {{ String(session.index + 1).padStart(2, '0') }}
          <span>{{ cardTypeLabel(card.type) }} · Lv. {{ card.level }}</span>
        </div>
        <MarkdownView class="study-question" :source="card.question" :assets="card.assets" />

        <div v-if="card.options" class="options" role="group" aria-label="답안 선택">
          <label
            v-for="(option, optionIndex) in card.options"
            :key="optionIndex"
            class="option"
            :class="{ correct: session.revealed && optionIndex === card.correct }"
          >
            <input
              type="radio"
              name="answer"
              :value="optionIndex"
              :checked="session.selected === optionIndex"
              :disabled="session.revealed"
              @change="study.select(optionIndex)"
            >
            <MarkdownView :source="option" :assets="card.assets" />
            <span v-if="session.revealed && optionIndex === card.correct" aria-label="정답">✓</span>
          </label>
        </div>

        <div v-if="session.revealed" class="answer">
          <h3>정답</h3>
          <MarkdownView :source="card.answer" :assets="card.assets" />
          <div class="explanation">
            <strong>해설</strong>
            <MarkdownView :source="card.explanation || '등록된 해설이 없습니다.'" :assets="card.assets" />
          </div>
        </div>
        <p v-else class="question-hint">정답을 확인하기 전에, 잠시 생각해 보세요.</p>

        <div class="management-actions study-management">
          <RouterLink class="secondary" :to="{ path: `/books/${book.id}/cards/${card.id}/edit`, query: { from: 'study' } }">
            문제 수정
          </RouterLink>
          <button class="secondary level-reset" type="button" :disabled="card.level === 1" @click="resetLevel">
            ↺ 암기 레벨 초기화
          </button>
          <button class="secondary" type="button" @click="statsOpen = true">카드 통계</button>
        </div>
        <p class="field-help">초기화하면 이 문제만 Level 1로 돌아갑니다.</p>
      </section>

      <div class="study-actions">
        <template v-if="session.revealed">
          <button class="secondary" type="button" :disabled="busy" @click="evaluate(false)">↻ &nbsp; 몰라요</button>
          <button class="primary" type="button" :disabled="busy" @click="evaluate(true)">✓ &nbsp; 알아요</button>
        </template>
        <button v-else class="primary" type="button" @click="reveal">정답 확인 <span aria-hidden="true">↓</span></button>
      </div>
      <p class="study-caption">
        {{ session.revealed ? '평가하면 다음 카드로 이동해요.' : '맞혔는지보다, 스스로 기억하고 있는지가 중요해요.' }}
      </p>

      <p class="card-live-time">이 카드 학습 시간 <strong>{{ elapsedText }}</strong></p>
      <div class="study-tools">
        <span>{{ shortcutText }}</span>
        <span role="timer">{{ timerText }}</span>
      </div>
    </template>

    <p v-else class="empty-note">
      학습할 카드를 찾을 수 없어요. <RouterLink :to="`/books/${book.id}`">문제집으로 돌아가기</RouterLink>
    </p>

    <CardStatsModal v-if="statsOpen && card" :card-id="card.id" @close="statsOpen = false" />
  </div>
</template>
