<script setup lang="ts">
import { ref } from 'vue'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/constants'
import MarkdownView from './MarkdownView.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    /** 입력 요소 id 이자 접근 가능한 이름 연결에 사용합니다. */
    id: string
    label: string
    assets: Record<string, string>
    rows?: number
    maxlength?: number
    required?: boolean
    placeholder?: string
    describedBy?: string
  }>(),
  { rows: 4, maxlength: 20000, required: false, placeholder: '', describedBy: undefined },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'add-asset': [id: string, data: string]
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const status = ref('')

function update(value: string) {
  emit('update:modelValue', value)
}

/** 선택한 글자를 prefix/suffix 로 감싸거나, 선택이 없으면 자리 표시 문구를 넣습니다. */
function wrap(prefix: string, suffix: string, fallback: string) {
  const el = textarea.value
  if (!el) return
  const { selectionStart: start, selectionEnd: end, value } = el
  const selected = value.slice(start, end) || fallback
  const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
  update(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
  })
}

/** 현재 줄 앞에 마커를 붙입니다. */
function prefixLines(marker: string) {
  const el = textarea.value
  if (!el) return
  const { selectionStart: start, selectionEnd: end, value } = el
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const block = value.slice(lineStart, end) || '내용'
  const next = value.slice(0, lineStart) + block.split('\n').map((line) => marker + line).join('\n') + value.slice(end)
  update(next)
  requestAnimationFrame(() => el.focus())
}

function insertAtCursor(text: string) {
  const el = textarea.value
  const position = el ? el.selectionEnd : props.modelValue.length
  update(props.modelValue.slice(0, position) + text + props.modelValue.slice(position))
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    status.value = 'PNG, JPEG, WebP 이미지만 첨부할 수 있어요.'
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    status.value = '이미지는 2MB 이하만 첨부할 수 있어요.'
    return
  }
  try {
    const data = await readAsDataUrl(file)
    const assetId = `img-${crypto.randomUUID()}`
    emit('add-asset', assetId, data)
    const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]()]/g, '') || '이미지'
    insertAtCursor(`\n![${alt}](asset:${assetId})\n`)
    status.value = `이미지를 첨부했어요: ${file.name}`
  } catch {
    status.value = '이미지를 읽지 못했어요. 다시 시도해 주세요.'
  }
}
</script>

<template>
  <div class="markdown-editor">
    <div class="editor-toolbar" role="toolbar" :aria-label="`${label} 서식 도구`">
      <button type="button" aria-label="굵게" title="굵게" @click="wrap('**', '**', '굵은 글씨')"><b>B</b></button>
      <button type="button" aria-label="기울임" title="기울임" @click="wrap('*', '*', '기울임')"><i>I</i></button>
      <button type="button" aria-label="코드" title="코드" @click="wrap('`', '`', 'code')">&lt;/&gt;</button>
      <button type="button" aria-label="글머리 목록" title="글머리 목록" @click="prefixLines('- ')">• 목록</button>
      <button type="button" aria-label="인용" title="인용" @click="prefixLines('> ')">❝ 인용</button>
      <button type="button" aria-label="링크" title="링크" @click="wrap('[', '](https://)', '링크 이름')">링크</button>
      <label class="image-upload">
        이미지 첨부
        <input type="file" accept="image/png,image/jpeg,image/webp" @change="onFile">
      </label>
    </div>
    <textarea
      :id="id"
      ref="textarea"
      :value="modelValue"
      :rows="rows"
      :maxlength="maxlength"
      :required="required"
      :placeholder="placeholder"
      :aria-describedby="describedBy"
      data-markdown
      @input="update(($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <p class="editor-help">Markdown 을 사용할 수 있어요. 이미지는 PNG, JPEG, WebP 2MB 이하를 첨부할 수 있어요.</p>
    <p v-if="status" class="editor-status" role="status">{{ status }}</p>
    <details class="editor-preview">
      <summary>{{ label }} 미리보기</summary>
      <MarkdownView v-if="modelValue.trim()" :source="modelValue" :assets="assets" />
      <p v-else class="preview-empty">입력한 내용이 여기에 표시됩니다.</p>
    </details>
  </div>
</template>
