import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api'
import { useBookStore } from './books'
import { useHistoryStore } from './history'
import { useSettingsStore } from './settings'

/** 앱 시작 시 한 번 데이터를 불러와 각 스토어에 나눠 담습니다. */
export const useAppStore = defineStore('app', () => {
  const ready = ref(false)
  const error = ref('')

  async function bootstrap() {
    try {
      const data = await api.bootstrap()
      useBookStore().hydrate(data)
      useHistoryStore().hydrate(data.history)
      useSettingsStore().hydrate(data)
      error.value = ''
    } catch (failure) {
      error.value = failure instanceof Error ? failure.message : '데이터를 불러오지 못했습니다.'
    } finally {
      ready.value = true
    }
  }

  return { ready, error, bootstrap }
})
