import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

const pending = ref<PendingConfirm | null>(null)

/** `window.confirm` 대신 접근 가능한 확인 대화상자를 사용합니다. */
export function useConfirm() {
  const confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      // 이미 열려 있다면 이전 요청은 취소로 처리합니다.
      pending.value?.resolve(false)
      pending.value = { ...options, resolve }
    })

  const settle = (value: boolean) => {
    pending.value?.resolve(value)
    pending.value = null
  }

  return { pending, confirm, settle }
}
