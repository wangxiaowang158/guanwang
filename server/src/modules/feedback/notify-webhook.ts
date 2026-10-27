// 群机器人 webhook 地址的校验与打码 —— 纯函数，便于单测
//
// 地址由后台填写、服务器发起请求：不限制域名就成了「让服务器替你访问任意地址」（SSRF），
// 可被用来探测内网。只放行三家官方机器人的 https 域名

/** 机器人类型 → 官方 webhook 域名 */
export const WEBHOOK_HOSTS: Record<string, string> = {
  wecom: 'qyapi.weixin.qq.com',
  dingtalk: 'oapi.dingtalk.com',
  feishu: 'open.feishu.cn',
}

export const WEBHOOK_TYPES = Object.keys(WEBHOOK_HOSTS)

/**
 * 校验 webhook 地址
 * @returns 错误提示；合法返回 null
 */
export function checkWebhook(url: string, type: string): string | null {
  const host = WEBHOOK_HOSTS[type]
  if (!host) return '机器人类型不正确'
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return '推送地址格式不正确，请从机器人设置里完整复制'
  }
  // 端口、用户名密码一律不允许：官方地址都没有，有就是被改过
  if (u.protocol !== 'https:' || u.hostname !== host || u.port || u.username || u.password) {
    return `推送地址须是 https://${host}/ 开头的官方地址`
  }
  return null
}

/**
 * 打码展示：地址里的 key / access_token 就是机器人密钥，后台只回显首尾
 * @param url 完整地址，空串原样返回
 */
export function maskWebhook(url: string): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    const tail = `${u.pathname}${u.search}`
    const secret = tail.length > 10 ? `${tail.slice(0, 6)}****${tail.slice(-4)}` : '****'
    return `${u.protocol}//${u.host}${secret}`
  } catch {
    return '****'
  }
}
