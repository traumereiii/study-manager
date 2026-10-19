<script setup lang="ts">
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>

<template>
  <div class="toast-region" role="status" aria-live="polite">
    <div v-for="item in toast.toasts" :key="item.id" class="toast" :class="`toast-${item.kind}`">
      <span>{{ item.message }}</span>
      <button type="button" aria-label="알림 닫기" @click="toast.dismiss(item.id)">×</button>
    </div>
  </div>
</template>
