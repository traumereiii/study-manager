<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { CARD_TYPES } from '@/constants'
import { useRequiredBook } from '@/composables/useRequiredBook'
import { useBookStore } from '@/stores/books'
import { useStudyStore } from '@/stores/study'
import { useToastStore } from '@/stores/toast'
import type { CardInput, CardType } from '@/types'
import { validateCardInput } from '@/utils/validation'

const props = defineProps<{ bookId: string; cardId?: string }>()

const route = useRoute()
const router = useRouter()
const books = useBookStore()
const study = useStudyStore()
const toast = useToastStore()
const book = useRequiredBook(() => props.bookId)

const editingCard = computed(() => (props.cardId ? books.getCard(props.cardId) : undefined))
const fromStudy = computed(() => route.query.from === 'study')
const editing = computed(() => !!props.cardId)

if (props.cardId && (!editingCard.value || editingCard.value.bookId !== props.bookId)) {
  void router.replace(`/books/${props.bookId}/manage`)
}

interface FormState {
  type: CardType
  question: string
  answer: string
  explanation: string
  options: string[]
  correct: number | null
}

const blankState = (): FormState => ({
  type: 'qa', question: '', answer: '', explanation: '', options: ['', '', '', ''], correct: null,
})

const form = reactive<FormState>(
  editingCard.value
    ? {
        type: editingCard.value.type,
        question: editingCard.value.question,
        answer: editingCard.value.type === 'choice' ? '' : editingCard.value.answer,
        explanation: editingCard.value.explanation,
        options: editingCard.value.options ? [...editingCard.value.options] : ['', '', '', ''],
        correct: editingCard.value.correct ?? null,
      }
    : blankState(),
)
const assets = reactive<Record<string, string>>({ ...(editingCard.value?.assets ?? {}) })
const error = ref('')
const saving = ref(false)

const isChoice = computed(() => form.type === 'choice')
const questionHelp = computed(() =>
  form.type === 'blank'
    ? '빈칸은 밑줄(______)로 표시해 주세요. 예: TCP는 ______ 프로토콜입니다.'
    : '답을 떠올릴 수 있도록 질문을 구체적으로 작성해 주세요.',
)

const backTo = computed(() => {
  if (editing.value) {
    return fromStudy.value ? `/books/${props.bookId}/study` : `/books/${props.bookId}/manage`
  }
  return `/books/${props.bookId}`
})
const backLabel = computed(() => {
  if (!editing.value) return `${book.value?.name ?? ''} 나가기`
  return fromStudy.value ? '학습으로 돌아가기' : '문제 관리'
})

const addAsset = (id: string, data: string) => {
  assets[id] = data
}

function toInput(): CardInput {
  return {
    type: form.type,
    question: form.question,
    answer: form.answer,
    explanation: form.explanation,
    options: isChoice.value ? [...form.options] : undefined,
    correct: isChoice.value ? (form.correct ?? undefined) : undefined,
    assets: { ...assets },
  }
}

function resetForm() {
  Object.assign(form, { ...blankState(), type: form.type })
  for (const key of Object.keys(assets)) delete assets[key]
}

async function submit() {
  if (saving.value) return
  error.value = ''
  saving.value = true
  try {
    const input = validateCardInput(toInput())
    if (editing.value && props.cardId) {
      await books.updateCard(props.cardId, input)
      // 학습 중 수정한 문제는 처음 상태로 다시 보여 주고 제한시간을 새로 시작합니다.
      const sameCard = study.session?.cardIds[study.session.index] === props.cardId
      if (fromStudy.value && sameCard) study.resetCurrentCard()
      toast.push('문제를 수정했습니다. 암기 레벨과 이전 학습 기록은 유지됩니다.')
      await router.push(backTo.value)
    } else {
      await books.createCard(props.bookId, input)
      const count = books.cardsOf(props.bookId).length
      toast.push(`${count}번째 문제를 Level 1로 저장했습니다. 이어서 다음 문제를 만들어 보세요.`)
      resetForm()
      window.scrollTo({ top: 0 })
      await nextTick()
      document.getElementById('question')?.focus()
    }
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : '저장하지 못했습니다. 입력 내용은 유지됩니다.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="book" class="create-shell">
    <RouterLink class="back" :to="backTo">← {{ backLabel }}</RouterLink>
    <div class="eyebrow">BUILD YOUR KNOWLEDGE</div>
    <h1>{{ editing ? '문제 수정' : '새 문제 만들기' }}</h1>
    <p class="subtitle">
      {{ editing ? '질문과 정답을 다듬어 보세요. 암기 레벨과 학습 기록은 유지됩니다.' : '기억하고 싶은 내용을 한 장의 카드로 만들어 보세요.' }}
    </p>

    <form class="panel create-form" novalidate @submit.prevent="submit">
      <div class="form-book">
        문제집 <strong>{{ book.name }}</strong>
        <span class="pill">{{ editing && editingCard ? `수정 중 · Level ${editingCard.level}` : '새 카드 · Level 1' }}</span>
      </div>

      <fieldset class="type-field">
        <legend>문제 유형</legend>
        <div class="type-options">
          <label v-for="item in CARD_TYPES" :key="item.value" class="type-option">
            <input v-model="form.type" type="radio" name="questionType" :value="item.value">
            <strong>{{ item.label }}</strong>
            <small>{{ item.hint }}</small>
          </label>
        </div>
      </fieldset>

      <div class="form-field">
        <label for="question">문제 <span>필수</span></label>
        <MarkdownEditor
          id="question"
          v-model="form.question"
          label="문제"
          :assets="assets"
          :rows="5"
          required
          placeholder="예: **인증**과 **인가**의 차이는 무엇인가요?"
          described-by="question-help"
          @add-asset="addAsset"
        />
        <p id="question-help" class="field-help">{{ questionHelp }}</p>
      </div>

      <fieldset v-if="isChoice" class="choice-fields">
        <legend>보기와 정답 <span>필수</span></legend>
        <p class="field-help">보기 4개를 입력하고, 정답인 보기 하나를 선택해 주세요.</p>
        <div v-for="(_, index) in form.options" :key="index" class="choice-editor">
          <div class="choice-editor-heading">
            <input
              v-model="form.correct"
              type="radio"
              name="correct"
              :value="index"
              :aria-label="`${index + 1}번 보기를 정답으로 선택`"
            >
            <label :for="`choice-${index}`">{{ index + 1 }}번 보기</label>
          </div>
          <MarkdownEditor
            :id="`choice-${index}`"
            v-model="form.options[index]"
            :label="`${index + 1}번 보기`"
            :assets="assets"
            :rows="3"
            :maxlength="5000"
            required
            :placeholder="`${index + 1}번 보기`"
            @add-asset="addAsset"
          />
        </div>
      </fieldset>

      <div v-else class="form-field">
        <label for="card-answer">정답 <span>필수</span></label>
        <MarkdownEditor
          id="card-answer"
          v-model="form.answer"
          label="정답"
          :assets="assets"
          :rows="3"
          required
          placeholder="정답을 입력해 주세요."
          @add-asset="addAsset"
        />
      </div>

      <div class="form-field">
        <label for="explanation">해설 <span class="optional">선택</span></label>
        <MarkdownEditor
          id="explanation"
          v-model="form.explanation"
          label="해설"
          :assets="assets"
          :rows="4"
          placeholder="이해를 돕는 설명이나 기억할 포인트를 적어 주세요."
          @add-asset="addAsset"
        />
      </div>

      <p class="field-help">
        {{ editing ? '학습 중 저장하면 같은 문제를 새 제한시간으로 다시 표시합니다.' : '새 문제는 Level 1로 추가됩니다.' }}
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="form-actions">
        <RouterLink class="secondary" :to="backTo">{{ editing ? '취소' : '나가기' }}</RouterLink>
        <button class="primary" type="submit" :disabled="saving">
          {{ editing ? '수정 저장하기' : '저장하고 계속 만들기 ＋' }}
        </button>
      </div>
    </form>
  </div>
</template>
