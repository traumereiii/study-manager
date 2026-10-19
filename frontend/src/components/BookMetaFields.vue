<script setup lang="ts">
import { BOOK_CATEGORIES, BOOK_ICONS } from '@/constants'
import type { BookCategory } from '@/types'

defineProps<{ category: BookCategory | ''; icon: string }>()
defineEmits<{
  'update:category': [value: BookCategory | '']
  'update:icon': [value: string]
}>()

const categoryOptions: { value: BookCategory | ''; label: string }[] = [
  { value: '', label: '선택 안 함' },
  ...BOOK_CATEGORIES.map((value) => ({ value, label: value })),
]
</script>

<template>
  <fieldset class="category-picker">
    <legend>문제집 유형 <span class="optional">선택</span></legend>
    <div class="category-options">
      <label v-for="option in categoryOptions" :key="option.value" class="category-option">
        <input
          type="radio"
          name="category"
          :value="option.value"
          :checked="category === option.value"
          @change="$emit('update:category', option.value)"
        >
        <span>{{ option.label }}</span>
      </label>
    </div>
    <p class="field-help">정하지 않아도 문제집을 만들 수 있어요.</p>
  </fieldset>

  <fieldset class="icon-picker">
    <legend>문제집 아이콘</legend>
    <div class="icon-options">
      <label v-for="option in BOOK_ICONS" :key="option.value" class="icon-option">
        <input
          type="radio"
          name="icon"
          :value="option.value"
          :checked="icon === option.value"
          @change="$emit('update:icon', option.value)"
        >
        <span aria-hidden="true">{{ option.value }}</span>
        <small>{{ option.label }}</small>
      </label>
    </div>
  </fieldset>
</template>
