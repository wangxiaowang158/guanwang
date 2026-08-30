// HTML 净化工具 —— 富文本/含 HTML 字段保存前调用，防存储型 XSS
import DOMPurify from 'dompurify'

/**
 * 净化富文本 HTML：移除脚本、事件处理器等危险内容，保留常规排版与图片
 * @param html 原始 HTML 字符串
 * @returns 净化后的安全 HTML
 */
export function sanitizeHtml(html?: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'], // 允许链接 target="_blank"
    FORBID_TAGS: ['style', 'script', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick']
  })
}
