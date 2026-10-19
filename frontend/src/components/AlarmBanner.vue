<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineEmits<{ close: [] }>()
</script>

<template>
  <aside class="alarm-banner" role="status">
    <div>
      <strong>차곡, 오늘의 학습 시간이에요.</strong>
      <p>잠시 시간을 내어 한 장부터 시작해 볼까요?</p>
    </div>
    <RouterLink class="primary" to="/books" @click="$emit('close')">문제집 보기</RouterLink>
    <button type="button" aria-label="알림 닫기" @click="$emit('close')">×</button>
  </aside>
</template>
