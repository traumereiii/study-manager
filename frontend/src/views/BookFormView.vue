<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BookMetaFields from '@/components/BookMetaFields.vue'
import { useBookStore } from '@/stores/books'
import { useToastStore } from '@/stores/toast'
import type { BookInput } from '@/types'
import { ValidationError, validateBookInput } from '@/utils/validation'

const props = defineProps<{ bookId?: string }>()

const router = useRouter()
const books = useBookStore()
const toast = useToastStore()

const existing = computed(() => (props.bookId ? books.getBook(props.bookId) : undefined))
const editing = computed(() => !!props.bookId)

// 수정 대상이 없으면 목록으로 돌려보냅니다.
if (props.bookId && !existing.value) void router.replace('/books')

const form = reactive<BookInput>({
  name: existing.value?.name ?? '',
  desc: existing.value?.desc ?? '',
  icon: existing.value?.icon ?? '▤',
  category: existing.value?.category ?? '',
})
const error = ref('')
const saving = ref(false)

async function submit() {
  if (saving.value) return
  error.value = ''
  saving.value = true
  try {
    const input = validateBookInput({ ...form })
    if (editing.value && props.bookId) {
      await books.updateBook(props.bookId, input)
      toast.push('문제집 정보를 수정했습니다.')
      await router.push(`/books/${props.bookId}`)
    } else {
      const book = await books.createBook(input)
      toast.push('새 문제집을 만들었습니다. 첫 문제를 추가해 보세요.')
      await router.push(`/books/${book.id}`)
    }
  } catch (failure) {
    error.value =
      failure instanceof ValidationError || failure instanceof Error
        ? failure.message
        : '저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="create-shell">
    <RouterLink class="back" :to="editing && existing ? `/books/${existing.id}` : '/books'">
      ← {{ editing && existing ? existing.name : '나의 문제집' }}
    </RouterLink>
    <div class="eyebrow">{{ editing ? 'YOUR LEARNING SPACE' : 'A NEW CHAPTER' }}</div>
    <h1>{{ editing ? '문제집 수정' : '문제집 만들기' }}</h1>
    <p class="subtitle">
      {{ editing ? '제목과 한 줄 소개를 내 학습에 맞게 다듬어 보세요.' : '배우고 싶은 주제를 담을 새로운 공간을 만들어 보세요.' }}
    </p>

    <form class="panel create-form" novalidate @submit.prevent="submit">
      <div class="form-field">
        <label for="book-name">문제집 이름 <span>필수</span></label>
        <input
          id="book-name"
          v-model="form.name"
          type="text"
          maxlength="60"
          required
          placeholder="예: 정보처리기사 필기"
          :aria-invalid="!!error"
          aria-describedby="book-name-help"
        >
        <p id="book-name-help" class="field-help">1~60자로 입력해 주세요.</p>
      </div>
      <div class="form-field">
        <label for="book-desc">한 줄 소개 <span class="optional">선택</span></label>
        <textarea
          id="book-desc"
          v-model="form.desc"
          maxlength="160"
          rows="3"
          placeholder="이 문제집에서 어떤 내용을 공부할까요?"
        ></textarea>
      </div>

      <BookMetaFields v-model:category="form.category" v-model:icon="form.icon" />

      <p class="field-help">
        {{ editing ? '등록된 문제와 암기 레벨, 학습 기록은 그대로 유지됩니다.' : '빈 문제집을 만든 뒤, 원하는 문제를 직접 추가할 수 있어요.' }}
      </p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="form-actions">
        <RouterLink class="secondary" :to="editing && existing ? `/books/${existing.id}` : '/books'">취소</RouterLink>
        <button class="primary" type="submit" :disabled="saving">
          {{ editing ? '문제집 수정 저장' : '문제집 만들기 ＋' }}
        </button>
      </div>
    </form>
  </div>
</template>
