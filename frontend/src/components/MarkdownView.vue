<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/markdown'

const props = withDefaults(
  defineProps<{ source: string; assets?: Record<string, string> }>(),
  { assets: () => ({}) },
)

// renderMarkdown 은 허용한 태그와 URL 만 남기도록 정화한 HTML 을 반환합니다.
const html = computed(() => renderMarkdown(props.source, props.assets))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-body" v-html="html"></div>
</template>
