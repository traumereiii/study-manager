<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import AlarmBanner from '@/components/AlarmBanner.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ToastRegion from '@/components/ToastRegion.vue'
import { useAppStore } from '@/stores/app'
import { useAlarm } from '@/composables/useAlarm'

const route = useRoute()
const app = useAppStore()
const alarm = useAlarm()

// 라우트가 바뀔 때 화면을 다시 만들어 입력 상태가 섞이지 않게 합니다.
const viewKey = computed(() => route.fullPath.split('?')[0])
</script>

<template>
  <a class="skip-link" href="#main">본문으로 건너뛰기</a>
  <AppSidebar />
  <div class="layout">
    <AppTopbar />
    <main id="main" tabindex="-1">
      <p v-if="app.error" class="form-error" role="alert">{{ app.error }}</p>
      <RouterView :key="viewKey" />
    </main>
    <footer>차곡차곡 쌓이는 나만의 지식 <span>STUDY MANAGER</span></footer>
  </div>
  <AlarmBanner v-if="alarm.visible.value" @close="alarm.dismiss" />
  <ToastRegion />
  <ConfirmDialog />
</template>
