import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { nowTimeKey, todayKey } from '@/utils/date'

const CHECK_INTERVAL_MS = 10_000

/**
 * 앱이 열려 있는 동안 지정 시각 이후 하루 한 번 학습 알림을 표시합니다.
 * 운영체제 알림이나 앱 종료 후 알림은 지원하지 않습니다.
 */
export function useAlarm() {
  const store = useSettingsStore()
  const visible = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined

  function check() {
    const { alarm, alarmTime } = store.settings
    if (!alarm || store.alarmLastDate === todayKey()) return
    if (nowTimeKey() < alarmTime) return
    visible.value = true
    void store.markAlarmShown(todayKey())
  }

  onMounted(() => {
    check()
    timer = setInterval(check, CHECK_INTERVAL_MS)
  })
  onBeforeUnmount(() => clearInterval(timer))

  return { visible, dismiss: () => { visible.value = false } }
}
