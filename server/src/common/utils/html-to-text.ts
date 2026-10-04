// 富文本转纯文本 —— 首页板块以纯文本呈现，但后台用富文本编辑器录入，库里存的是 HTML
// 直接输出会让访客看到 <p> 标签，故在装配前台数据时统一转换

/** 常见实体，富文本编辑器输出里基本只会出现这些 */
const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&amp;': '&', // 须最后替换，避免把 &amp;lt; 二次解码成 <
}

/**
 * 把 HTML 转成保留换行的纯文本
 * 段落、换行、列表项、标题等块级边界转为换行，其余标签剥除。
 * 纯文本输入原样返回（仅做首尾空白清理），兼容种子数据里的旧格式
 * @param html 富文本 HTML 或纯文本
 * @returns 纯文本，块之间以 \n 分隔，连续空行压成一个
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ''
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
  for (const [entity, char] of Object.entries(ENTITIES)) {
    text = text.split(entity).join(char)
  }
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
