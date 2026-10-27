// 匿名留言防刷 —— 不打扰真人的三道机器闸门
//
// 为什么不上图形/滑块验证码：B2B 官网的留言就是线索，每多一步操作都在流失真实客户；
// 现有 IP 限流（5 次/分钟）已挡住高频灌水，这里补的是「低频但全自动」的脚本：
//   1. 蜜罐字段：表单里藏一个真人看不见的输入框，脚本按字段名逐个填满就会踩中
//   2. 表单令牌：打开表单时向后端领一个签名时间戳，提交时校验「填写用时」——
//      快于 3 秒不是人手能填完的；超过 2 小时视作过期（防令牌被批量囤积复用）
//   3. 内容特征：留言里链接过多是典型的 SEO 垃圾
// 蜜罐与「填得太快」两道真人几乎不可能触发，命中时返回与成功相同的提示、静默丢弃，
// 不让脚本作者从报错里分辨出是哪道闸门挡住的。
// 令牌缺失/过期、链接过多则可能是真人（发版后页面还开着旧代码、页面挂了一下午、贴了几个参考链接），
// 静默丢弃会让真实线索凭空消失，故明确提示用户怎么改
//
// 令牌无状态（HMAC 签名），不占存储；密钥由管理端 JWT 密钥派生，与预览令牌同一做法
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { JWT_ADMIN } from '../../config/app.config'

/** 最短填写用时：真人读题加填姓名电话留言，3 秒是很宽松的下限 */
export const FORM_MIN_FILL_MS = 3_000

/** 令牌有效期：页面开着去开会、回来再填，2 小时足够 */
export const FORM_TOKEN_TTL_MS = 2 * 3600 * 1000

/** 留言里允许的链接数上限 */
export const MAX_LINKS_IN_CONTENT = 2

const KEY = createHmac('sha256', JWT_ADMIN.secret).update('feedback-form/v1').digest()

const sign = (payload: string): string => createHmac('sha256', KEY).update(payload).digest('base64url')

/**
 * 签发表单令牌
 * 带随机串：同一毫秒签出的令牌也互不相同，日志里能区分
 */
export function issueFormToken(now = Date.now()): string {
  const payload = `${now.toString(36)}.${randomBytes(6).toString('base64url')}`
  return `${payload}.${sign(payload)}`
}

/**
 * 闸门判定结果
 * - silent：按成功回复、不入库（机器特征明确）
 * - message：明确告知用户的提示（可能是真人）
 * reason 只记日志
 */
export type GuardVerdict =
  | { pass: true }
  | { pass: false; reason: string; silent: true }
  | { pass: false; reason: string; silent: false; message: string }

const EXPIRED_MESSAGE = '页面已停留较久，请刷新页面后重新提交'

/**
 * 校验一次匿名提交
 * @param input 蜜罐字段值、表单令牌、留言正文
 */
export function checkFormSubmission(
  input: { honeypot?: string; formToken?: string; content: string },
  now = Date.now(),
): GuardVerdict {
  if (input.honeypot) return { pass: false, reason: 'honeypot', silent: true }

  const expired = (reason: string): GuardVerdict => ({ pass: false, reason, silent: false, message: EXPIRED_MESSAGE })
  const token = input.formToken
  if (typeof token !== 'string' || !token || token.length > 200) return expired('token-missing')
  const parts = token.split('.')
  if (parts.length !== 3) return expired('token-malformed')
  const [ts36, nonce, sig] = parts
  const expectedSig = Buffer.from(sign(`${ts36}.${nonce}`))
  const actualSig = Buffer.from(sig)
  if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) {
    return expired('token-forged')
  }
  const issuedAt = parseInt(ts36, 36)
  if (!Number.isFinite(issuedAt)) return expired('token-malformed')
  const elapsed = now - issuedAt
  if (elapsed < FORM_MIN_FILL_MS) return { pass: false, reason: 'too-fast', silent: true }
  if (elapsed > FORM_TOKEN_TTL_MS) return expired('token-expired')

  const links = input.content.match(/https?:\/\/|www\./gi)?.length ?? 0
  if (links > MAX_LINKS_IN_CONTENT) {
    return { pass: false, reason: 'too-many-links', silent: false, message: `留言中的链接不能超过 ${MAX_LINKS_IN_CONTENT} 个` }
  }
  return { pass: true }
}
