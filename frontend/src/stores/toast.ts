import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Toast {
  id: number
  message: string
  kind: 'success' | 'error'
}

const DURATION_MS = 5000

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let seq = 0

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(message: string, kind: Toast['kind'] = 'success') {
    if (!message) return
    // 같은 메시지는 중복해서 쌓지 않습니다.
    if (toasts.value.some((toast) => toast.message === message)) return
    seq += 1
    const id = seq
    toasts.value.push({ id, message, kind })
    setTimeout(() => dismiss(id), DURATION_MS)
  }

  return { toasts, push, dismiss }
})
