// HTML 转义 —— 预渲染正文片段与 head 片段共用

/**
 * 转义 HTML 文本节点与属性值
 * 片段是拼字符串生成的，任何来自库里的文本都必须过这里——
 * 后台管理员账号失陷时，一个栏目名就能变成打到全站访客的存储型 XSS
 */
export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
