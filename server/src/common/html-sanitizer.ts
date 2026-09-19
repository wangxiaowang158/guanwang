// 富文本净化 —— 正文要以 HTML 原样渲染到前台，必须先过白名单
// 内容由后台管理员录入，可信度高但不等于可信：管理员账号一旦失陷，
// 正文就是一条打到所有公开访客的存储型 XSS 通道
import sanitizeHtml from 'sanitize-html'

/**
 * 富文本白名单配置
 * 标签集合对齐编辑器实际能产出的内容（tiptap StarterKit + 图片 + 视频），
 * 多放的标签只会扩大攻击面，不会让编辑器多出功能
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'hr', 'strong', 'em', 's', 'u', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote',
    'a', 'img', 'video', 'source',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    // 不放 autoplay：正文里自动播放既扰民又会被浏览器策略拦，
    // 首页 Hero 的自动播放是另一条独立链路，不经过正文
    video: ['src', 'poster', 'controls', 'preload', 'width', 'height', 'playsinline', 'loop', 'muted'],
    source: ['src', 'type'],
  },
  // 只允许这几种协议，挡掉 javascript: / data: 这类可执行伪协议
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src', 'poster'],
  // 站内上传地址是 /uploads/... 这种相对路径，必须放行
  allowProtocolRelative: false,
  // 外链统一加 noopener，防止被跳转页反向操作 window.opener
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
}

/**
 * 净化富文本 HTML
 * 保存时与前台输出时各调一次：保存时净化让库里存的就是干净数据，
 * 输出时再净化是为了覆盖本次改动之前入库的历史脏数据
 * @param html 原始 HTML，空值按空串处理
 * @returns 过完白名单的 HTML
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return ''
  return sanitizeHtml(html, RICH_TEXT_OPTIONS)
}
