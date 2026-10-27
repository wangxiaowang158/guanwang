// 草稿预览令牌 —— 后台签发、前台页面接口校验，让管理员在官网真实版式里看到未发布内容
//
// 形态：<页面 key>.<过期时间戳 base36>.<HMAC-SHA256 base64url>
// - 绑定页面 key：拿到一个页面的预览链接，看不到别的页面的草稿
// - 30 分钟过期：链接被转发或留在浏览器历史里，过后即失效
// - 密钥由管理端 JWT 密钥派生（加用途前缀），不另起一个要运维配置的环境变量；
//   派生而非直接复用，令牌泄露也推不出 JWT 签名
import { createHmac, timingSafeEqual } from 'node:crypto'
import { JWT_ADMIN } from '../../config/app.config'

/** 有效期 */
export const PREVIEW_TTL_MS = 30 * 60 * 1000

const KEY = createHmac('sha256', JWT_ADMIN.secret).update('portal-preview/v1').digest()

const sign = (payload: string): string => createHmac('sha256', KEY).update(payload).digest('base64url')

/**
 * 签发预览令牌
 * @param pageKey 顶级页面 key
 * @param now 当前时间，测试注入用
 */
export function issuePreviewToken(pageKey: string, now = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = now + PREVIEW_TTL_MS
  const payload = `${pageKey}.${expiresAt.toString(36)}`
  return { token: `${payload}.${sign(payload)}`, expiresAt }
}

/**
 * 校验预览令牌
 * @param token 前台带来的令牌
 * @param pageKey 当前请求的页面 key
 * @returns 有效且属于该页面时为 true
 */
export function verifyPreviewToken(token: unknown, pageKey: string, now = Date.now()): boolean {
  if (typeof token !== 'string' || token.length > 300) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [key, exp36, sig] = parts
  if (key !== pageKey) return false
  const expiresAt = parseInt(exp36, 36)
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false
  const expected = Buffer.from(sign(`${key}.${exp36}`))
  const actual = Buffer.from(sig)
  // 等长才比，timingSafeEqual 要求长度一致；常量时间比较避免按耗时逐字节猜签名
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
