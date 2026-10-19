<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useConfirm } from '@/composables/useConfirm'

const { pending, settle } = useConfirm()
const dialog = ref<HTMLElement | null>(null)
const opener = ref<HTMLElement | null>(null)

watch(pending, async (value) => {
  if (value) {
    opener.value = document.activeElement as HTMLElement | null
    await nextTick()
    dialog.value?.focus()
  } else {
    opener.value?.focus?.()
  }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    settle(false)
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="pending" class="modal-backdrop" @click.self="settle(false)" @keydown="onKeydown">
      <div
        ref="dialog"
        class="modal panel confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        tabindex="-1"
      >
        <h2 id="confirm-title">{{ pending.title }}</h2>
        <p id="confirm-message" class="panel-caption">{{ pending.message }}</p>
        <div class="form-actions">
          <button type="button" class="secondary" @click="settle(false)">
            {{ pending.cancelLabel ?? '취소' }}
          </button>
          <button
            type="button"
            :class="pending.danger ? 'secondary danger-action' : 'primary'"
            @click="settle(true)"
          >
            {{ pending.confirmLabel ?? '확인' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
