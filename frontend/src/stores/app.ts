import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api'
import { DEFAULT_SETTINGS } from '@/constants'
import { useBookStore } from './books'
import { useHistoryStore } from './history'
import { useSettingsStore } from './settings'

/** 로그인 후 한 번 데이터를 불러와 각 스토어에 나눠 담습니다. */
export const useAppStore = defineStore('app', () => {
  /** 데이터를 성공적으로 불러왔는지. 실패하면 false 로 남아 다음 이동 때 다시 시도합니다. */
  const loaded = ref(false)
  const error = ref('')

  async function bootstrap() {
    try {
      const data = await api.bootstrap()
      useBookStore().hydrate(data)
      useHistoryStore().hydrate(data.history)
      useSettingsStore().hydrate(data)
      error.value = ''
      loaded.value = true
    } catch (failure) {
      error.value = failure instanceof Error ? failure.message : '데이터를 불러오지 못했습니다.'
    }
  }

  /** 로그아웃·세션 만료 시 이전 사용자의 데이터가 화면에 남지 않도록 비웁니다. */
  function reset() {
    useBookStore().hydrate({ books: [], cards: [] })
    useHistoryStore().hydrate([])
    useSettingsStore().hydrate({ settings: { ...DEFAULT_SETTINGS }, alarmLastDate: '' })
    loaded.value = false
    error.value = ''
  }

  return { loaded, error, bootstrap, reset }
})
