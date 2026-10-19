import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api'
import { DEFAULT_SETTINGS } from '@/constants'
import type { Settings } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
  const alarmLastDate = ref('')

  function hydrate(data: { settings: Settings; alarmLastDate: string }) {
    settings.value = { ...DEFAULT_SETTINGS, ...data.settings }
    alarmLastDate.value = data.alarmLastDate
  }

  async function save(next: Settings) {
    settings.value = await api.saveSettings(next)
  }

  async function markAlarmShown(date: string) {
    alarmLastDate.value = date
    await api.setAlarmLastDate(date)
  }

  return { settings, alarmLastDate, hydrate, save, markAlarmShown }
})
