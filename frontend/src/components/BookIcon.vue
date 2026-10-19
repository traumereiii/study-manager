<script setup lang="ts">
import type { Book } from '@/types'

defineProps<{ book: Pick<Book, 'icon' | 'color' | 'ink'> }>()
</script>

<template>
  <span class="book-icon" :style="{ '--book-bg': book.color, '--book-ink': book.ink }" aria-hidden="true">
    {{ book.icon }}
  </span>
</template>
