// HTML 净化 —— 富文本正文用 v-html 渲染前必须过一遍
// 后端保存与输出时已各净化一次，这里是最后一道：
// 渲染端自己兜住风险后，数据来源换了也不会突然变成 XSS 通道
import DOMPurify from 'dompurify'

/**
 * 校验外链地址，只放行 http(s)
 * 后台配置的地址会进 href，`javascript:` 这类伪协议点击即执行，
 * 而 DOMPurify 只管 v-html 的正文，管不到属性绑定，故单独兜一道
 * @param url 后台配置的原始地址
 * @returns 可安全用于 href 的地址；非法或为空时返回空串
 */
export function safeExternalUrl(url?: string): string {
  const raw = (url || '').trim()
  if (!raw) return ''
  try {
    // 相对路径不是有效外链，交给 URL 构造直接抛错挡掉
    const parsed = new URL(raw)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? raw : ''
  } catch {
    return ''
  }
}

/**
 * 净化富文本 HTML，保留常规排版与图片、视频
 * @param html 原始 HTML
 * @returns 净化后可安全交给 v-html 的 HTML
 */
export function sanitizeRichText(html?: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    // 正文里不该出现这些：style 可做界面伪装，iframe/script/object 可加载外部代码
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['style', 'srcdoc'],
    // 只保留 http(s) 与站内相对路径，挡掉 javascript: 这类伪协议
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  })
}
