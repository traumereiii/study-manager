<script setup lang="ts">
import { reactive, ref } from 'vue'
import { DEFAULT_SETTINGS, KEY_OPTIONS, keyLabel } from '@/constants'
import { useSettingsStore } from '@/stores/settings'
import { useToastStore } from '@/stores/toast'
import type { Settings } from '@/types'
import { validateSettings } from '@/utils/validation'

const store = useSettingsStore()
const toast = useToastStore()

const form = reactive<Settings>({ ...store.settings })
const error = ref('')
const status = ref('')
const saving = ref(false)

const shortcutFields: { key: 'reveal' | 'unknown' | 'known'; label: string }[] = [
  { key: 'reveal', label: '정답 확인' },
  { key: 'unknown', label: '몰라요' },
  { key: 'known', label: '알아요' },
]

function loadDefaults() {
  Object.assign(form, DEFAULT_SETTINGS)
  error.value = ''
  status.value = '기본값을 불러왔습니다. 설정 저장하기를 눌러 적용해 주세요.'
}

async function submit() {
  if (saving.value) return
  error.value = ''
  status.value = ''
  saving.value = true
  try {
    await store.save(validateSettings({ ...form, timeLimit: Number(form.timeLimit) }))
    status.value = '✓ 설정이 저장되었습니다.'
    toast.push('설정을 저장했습니다.')
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : '설정을 저장하지 못했습니다.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="create-shell">
    <div class="eyebrow">MAKE IT YOURS</div>
    <h1>설정</h1>
    <p class="subtitle">내 학습 습관에 맞춰 편안하게 조정해 보세요.</p>

    <form class="settings-form" novalidate @submit.prevent="submit">
      <section class="panel">
        <div class="setting-heading">
          <div>
            <h2>단축키 설정</h2>
            <p class="panel-caption">학습 화면에서 키보드로 카드를 넘겨 보세요.</p>
          </div>
          <label class="toggle"><input v-model="form.shortcuts" type="checkbox"> 사용</label>
        </div>
        <div class="shortcut-grid">
          <div v-for="field in shortcutFields" :key="field.key" class="form-field">
            <label :for="`key-${field.key}`">{{ field.label }}</label>
            <select :id="`key-${field.key}`" v-model="form[field.key]">
              <option v-for="option in KEY_OPTIONS" :key="option" :value="option">{{ keyLabel(option) }}</option>
            </select>
          </div>
        </div>
        <p class="field-help">동작마다 서로 다른 키를 지정해 주세요. 입력 중에는 단축키가 실행되지 않습니다.</p>
      </section>

      <section class="panel">
        <div class="setting-heading">
          <div>
            <h2>알람 설정</h2>
            <p class="panel-caption">매일 같은 시간, 학습할 시간을 알려드려요.</p>
          </div>
          <label class="toggle"><input v-model="form.alarm" type="checkbox"> 사용</label>
        </div>
        <div class="form-field">
          <label for="alarm-time">알림 시간</label>
          <input id="alarm-time" v-model="form.alarmTime" type="time" required>
        </div>
        <p class="field-help">
          기기 현지 시각 기준으로 하루 한 번 앱 안에 알림이 표시됩니다. 앱을 열어 둔 동안만 작동하며, 백그라운드에서는 늦어질 수 있습니다.
        </p>
      </section>

      <section class="panel">
        <h2>문제 제한시간</h2>
        <p class="panel-caption">시간이 지나면 정답을 자동으로 보여드립니다. 평가는 직접 선택해 주세요.</p>
        <div class="form-field time-setting">
          <label for="time-limit">문제당 시간 (초)</label>
          <input
            id="time-limit"
            v-model.number="form.timeLimit"
            type="number"
            min="0"
            max="600"
            step="1"
            required
            aria-describedby="time-limit-help"
          >
          <p id="time-limit-help" class="field-help">0은 시간 제한 없음 · 최대 600초 · 다음 문제부터 적용됩니다.</p>
        </div>
      </section>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <p v-if="status" class="field-help" role="status">{{ status }}</p>
      <div class="form-actions">
        <button class="secondary" type="button" @click="loadDefaults">기본값으로 설정</button>
        <button class="primary" type="submit" :disabled="saving">설정 저장하기 ✓</button>
      </div>
    </form>
  </div>
</template>
