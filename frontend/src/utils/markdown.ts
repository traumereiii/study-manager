import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { MAX_IMAGE_BYTES } from '@/constants'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string)

// 업로드(png/jpeg/webp)와 내장 예시 이미지(svg)만 data URL 로 허용합니다.
const ALLOWED_IMAGE_DATA =
  /^data:image\/(?:(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*|svg\+xml;charset=utf-8,[^"'<>\s]+)$/

function safeUrl(value: string, image: boolean, assets: Record<string, string>): string {
  if (image && value.startsWith('asset:')) {
    const data = assets[value.slice(6)]
    return typeof data === 'string' && data.length <= MAX_IMAGE_BYTES * 1.4 && ALLOWED_IMAGE_DATA.test(data)
      ? data
      : ''
  }
  try {
    const url = new URL(value)
    const okProtocol = url.protocol === 'https:' || (!image && url.protocol === 'http:')
    return okProtocol && !url.username && !url.password ? url.href : ''
  } catch {
    return ''
  }
}

/**
 * 사용자가 입력한 Markdown 을 안전한 HTML 로 변환합니다.
 * 원문 HTML 은 이스케이프하고, 허용한 태그와 URL 만 남깁니다.
 */
export function renderMarkdown(source: string, assets: Record<string, string> = {}): string {
  const parser = new Marked({
    gfm: true,
    breaks: true,
    renderer: {
      html({ text }) {
        return escapeHtml(text)
      },
      image({ href, text }) {
        const url = safeUrl(href, true, assets)
        return url
          ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy" referrerpolicy="no-referrer">`
          : `<span>${escapeHtml(text || '이미지를 표시할 수 없습니다.')}</span>`
      },
      link({ href, tokens }) {
        const label = this.parser.parseInline(tokens)
        const url = safeUrl(href, false, assets)
        return url
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : label
      },
    },
  })
  const html = parser.parse(source || '', { async: false })
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'del', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'span', 'input',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'target', 'rel', 'loading', 'referrerpolicy',
      'type', 'checked', 'disabled', 'start',
    ],
    ALLOW_DATA_ATTR: false,
    // data: 이미지는 위에서 직접 검증했으므로 img src 에 한해 허용합니다.
    ADD_DATA_URI_TAGS: ['img'],
  })
}
