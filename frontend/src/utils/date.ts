/** 기기 현지 날짜를 YYYY-MM-DD 로 반환합니다. */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayKey = (): string => toDateKey()

/** `YYYY-MM-DD` → `MM/DD` */
export function shortDate(key: string | null): string {
  return key ? key.slice(5).replace('-', '/') : ''
}

/** 기기 현지 시각을 HH:mm 으로 반환합니다. */
export function nowTimeKey(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}초`
  const minutes = Math.floor(seconds / 60)
  return minutes < 60
    ? `${minutes}분 ${seconds % 60}초`
    : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
}
