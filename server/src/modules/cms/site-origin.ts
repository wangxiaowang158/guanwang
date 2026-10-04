// 站点 origin 规整 —— sitemap / robots / 预渲染 head 共用
// 三处都要把后台录入的域名拼成绝对地址，口径必须一致，否则 canonical 与 sitemap 的 loc 会对不上

/**
 * 控制字符（含换行）
 * 用字符串构造而非正则字面量：模式里是转义序列而非真实字符，
 * 避免源码文件本身混入不可见字节
 */
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')

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
  const trimmed = website
    .replace(CONTROL_CHARS, '')
    .trim()
    .replace(/\/+$/, '')
  if (!trimmed) return ''
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}
