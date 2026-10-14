// Markdown 원문은 그대로 저장하고, 표시할 때 허용한 서식과 URL만 사용합니다.
const bookIcons = [
  ['▤', '책'], ['⌘', '개발'], ['ϟ', '전기'], ['⊞', '네트워크'],
  ['✎', '필기'], ['∑', '수학'], ['◎', '언어'], ['⚗', '과학'], ['♫', '음악'], ['★', '별']
];
const allowedImageData = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
const maxCardImageBytes = 2 * 1024 * 1024;

const bookCategories = ['단어', '용어', '개념'];

function categoryPicker(current = '') {
  const options = [['', '선택 안 함'], ...bookCategories.map(value => [value, value])];
  return `<fieldset class="category-picker"><legend>문제집 유형 <span class="optional">선택</span></legend><div class="category-options">${options.map(([value, label]) => `<label class="category-option"><input type="radio" name="category" value="${value}" ${current === value ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div><p class="field-help">정하지 않아도 문제집을 만들 수 있어요.</p></fieldset>`;
}

function iconPicker(current) {
  return `<fieldset class="icon-picker"><legend>문제집 아이콘</legend><div class="icon-options">${bookIcons.map(([icon, label]) => `<label class="icon-option"><input type="radio" name="icon" value="${icon}" ${current === icon ? 'checked' : ''}><span aria-hidden="true">${icon}</span><small>${label}</small></label>`).join('')}</div></fieldset>`;
}

function safeContentUrl(value, image = false, assets = {}) {
  if (typeof value !== 'string') return '';
  if (image && value.startsWith('asset:')) {
    const data = assets[value.slice(6)];
    return typeof data === 'string' && data.length <= maxCardImageBytes && allowedImageData.test(data) ? data : '';
  }
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || (!image && url.protocol === 'http:')) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function renderMarkdown(value, assets = {}) {
  // 라이브러리 로드 실패 시에도 HTML을 실행하지 않고 원문을 표시합니다.
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') return escapeHtml(value);
  const parser = new marked.Marked({ gfm: true, breaks: true, renderer: {
    html({ text }) { return escapeHtml(text); },
    image({ href, text }) {
      const url = safeContentUrl(href, true, assets);
      return url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy" referrerpolicy="no-referrer">` : `<span>${escapeHtml(text || '이미지를 표시할 수 없습니다.')}</span>`;
    },
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      const url = safeContentUrl(href);
      return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    }
  }});
  return DOMPurify.sanitize(parser.parse(String(value || '')), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'span', 'input'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'loading', 'referrerpolicy', 'type', 'checked', 'disabled', 'start'],
    ALLOW_DATA_ATTR: false
  });
}

function cardAssets(data, contents) {
  let assets;
  try { assets = JSON.parse(String(data.get('assets') || '{}')); }
  catch { throw new Error('첨부 이미지 정보를 읽지 못했습니다. 이미지를 다시 첨부해 주세요.'); }
  if (!assets || typeof assets !== 'object' || Array.isArray(assets)) throw new Error('첨부 이미지 정보가 올바르지 않습니다.');
  const result = {};
  const references = new Set(contents.join('\n').match(/asset:(img-[\w-]+)/g) || []);
  for (const reference of references) {
    const key = reference.slice(6);
    const value = assets[key];
    if (typeof value !== 'string' || value.length > maxCardImageBytes || !allowedImageData.test(value)) throw new Error('첨부 이미지를 찾을 수 없습니다. 이미지를 다시 첨부해 주세요.');
    result[key] = value;
  }
  if (Object.values(result).reduce((total, value) => total + value.length, 0) > maxCardImageBytes) throw new Error('한 카드의 이미지 용량을 초과했습니다. 이미지 수를 줄여 주세요.');
  return result;
}

function editorAssets(form) {
  try { return JSON.parse(form.elements.namedItem('assets').value || '{}'); } catch { return {}; }
}

function updateMarkdownPreview(textarea) {
  const preview = document.getElementById(`${textarea.id}-preview`);
  if (preview) preview.innerHTML = textarea.value.trim() ? renderMarkdown(textarea.value, editorAssets(textarea.form)) : '<p class="preview-empty">입력한 내용의 미리보기가 여기에 표시됩니다.</p>';
}

function mountMarkdownEditors(form) {
  if (!form?.querySelectorAll) return;
  form.querySelectorAll('textarea[data-markdown]').forEach(textarea => {
    const label = textarea.dataset.markdown;
    textarea.insertAdjacentHTML('beforebegin', `<div class="editor-toolbar" role="group" aria-label="${label} 서식 도구"><button type="button" data-editor="bold" data-target="${textarea.id}">굵게</button><button type="button" data-editor="heading" data-target="${textarea.id}">제목</button><button type="button" data-editor="list" data-target="${textarea.id}">목록</button><button type="button" data-editor="code" data-target="${textarea.id}">코드</button><label class="image-upload">이미지 첨부<input type="file" accept="image/png,image/jpeg,image/webp" data-image-target="${textarea.id}" aria-label="${label} 이미지 첨부"></label></div>`);
    textarea.insertAdjacentHTML('afterend', `<p class="editor-help">Markdown · PNG/JPEG/WebP 5MB 이하 · 이미지 붙여넣기 가능</p><details class="editor-preview" open><summary>${label} 미리보기</summary><div id="${textarea.id}-preview" class="markdown-body"></div></details><p id="${textarea.id}-upload-status" class="editor-status" role="status"></p>`);
    updateMarkdownPreview(textarea);
  });
}

function insertEditorText(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? start;
  if (textarea.value.length - (end - start) + text.length > textarea.maxLength) throw new Error('입력 가능한 글자 수를 초과했습니다. 내용을 줄여 주세요.');
  textarea.setRangeText(text, start, end, 'end');
  textarea.focus();
  updateMarkdownPreview(textarea);
}

async function prepareImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('PNG, JPEG, WebP 이미지를 선택해 주세요.');
  if (file.size > 5 * 1024 * 1024) throw new Error('이미지는 파일당 5MB 이하로 선택해 주세요.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('이미지를 읽을 수 없습니다. 다른 파일을 선택해 주세요.'); });
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/webp', .82);
    if (!allowedImageData.test(result) || result.length > 600 * 1024) throw new Error('이미지가 너무 큽니다. 크기를 줄인 후 다시 첨부해 주세요.');
    return result;
  } finally { bitmap.close(); }
}

async function attachEditorImage(textarea, file) {
  const form = textarea.form;
  const status = document.getElementById(`${textarea.id}-upload-status`);
  form.dataset.uploads = String(Number(form.dataset.uploads || 0) + 1);
  status.textContent = '이미지를 준비하고 있어요. 완료 후 저장해 주세요.';
  try {
    const value = await prepareImage(file);
    if (!textarea.isConnected) return;
    const assets = editorAssets(form);
    const key = `img-${crypto.randomUUID()}`;
    if (Object.values(assets).reduce((total, item) => total + item.length, value.length) > maxCardImageBytes) throw new Error('한 카드에 첨부할 수 있는 이미지 용량을 초과했습니다.');
    const alt = (file.name || '첨부 이미지').replace(/[\[\]<>\r\n]/g, '').slice(0, 60);
    assets[key] = value;
    const field = form.elements.namedItem('assets');
    const previous = field.value;
    field.value = JSON.stringify(assets);
    try { insertEditorText(textarea, `\n![${alt}](asset:${key})\n`); }
    catch (error) { field.value = previous; throw error; }
    status.textContent = '이미지를 첨부했습니다. 입력란의 이미지 문법을 지우면 저장 시 제거됩니다.';
  } catch (error) { status.textContent = error.message; }
  finally { form.dataset.uploads = String(Math.max(0, Number(form.dataset.uploads) - 1)); }
}

function ensureUploadsFinished(form) {
  if (Number(form.dataset.uploads || 0) > 0) throw new Error('이미지 첨부가 끝난 후 저장해 주세요.');
}

function startMarkdownEditors() {
  app.addEventListener('input', event => { if (event.target.matches?.('textarea[data-markdown]')) updateMarkdownPreview(event.target); });
  app.addEventListener('change', event => {
    const target = event.target.dataset?.imageTarget;
    if (target && event.target.files?.[0]) {
      attachEditorImage(document.getElementById(target), event.target.files[0]);
      event.target.value = '';
    }
  });
  app.addEventListener('paste', event => {
    if (!event.target.matches?.('textarea[data-markdown]')) return;
    const file = [...(event.clipboardData?.files || [])].find(item => item.type.startsWith('image/'));
    if (file) { event.preventDefault(); attachEditorImage(event.target, file); }
  });
  app.addEventListener('click', event => {
    const button = event.target.closest('[data-editor]');
    if (!button) return;
    const textarea = document.getElementById(button.dataset.target);
    const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) || '내용';
    const snippets = { bold: `**${selected}**`, heading: `\n## ${selected}\n`, list: `\n- ${selected}\n`, code: `\n\`\`\`\n${selected}\n\`\`\`\n` };
    try { insertEditorText(textarea, snippets[button.dataset.editor]); }
    catch (error) { document.getElementById(`${textarea.id}-upload-status`).textContent = error.message; }
  });
}
