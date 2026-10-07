// 站点 origin 规整 —— sitemap / robots / 预渲染 head 共用
// 三处都要把后台录入的域名拼成绝对地址，口径必须一致，否则 canonical 与 sitemap 的 loc 会对不上

/**
 * 剔除控制字符（U+0000–U+001F 与 U+007F，含换行）
 * 按字符码判断而非正则：控制字符正则会被 lint 视为可疑写法，也避免源码混入不可见字节
 */
function stripControlChars(value: string): string {
  return Array.from(value)
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code > 0x1f && code !== 0x7f
    })
    .join('')
}

/**
 * 把后台填写的站点域名规整成可用的 origin
 * 后台常只填 www.example.com，缺协议头的补 https
 * @param website 站点配置里的域名，可能为空或不含协议
 * @returns 不带尾斜杠的 origin；未配置时返回空串
 */
export function normalizeOrigin(website: string): string {
  // 先剔不可见字符：各处的转义函数只管 & < > " '，管不了这一类。
  // 后台若在域名里粘进换行或不可见字节，转义后原样进 sitemap 的 loc 节点，
  // 整份 sitemap 会变成 not well-formed 被搜索引擎丢弃，而后台界面看不出异常
  const trimmed = stripControlChars(website)
    .trim()
    .replace(/\/+$/, '')
  if (!trimmed) return ''
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}
