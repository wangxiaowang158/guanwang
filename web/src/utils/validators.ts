// 前台表单校验口径 —— 与后端 DTO 同一口径（SRS 3.5.2 / 3.5.12 / 3.5.13）
// 各表单原先各写一份正则与长度，已经出现过注册 60 字、账号设置 100 字、
// 注册手机号只校验「1 开头 11 位」而后端要求第二位 3-9 这类前后不一

/** 中国大陆手机号 */
export const PHONE_PATTERN = /^1[3-9]\d{9}$/

/** 邮箱格式 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 昵称长度区间 */
export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 20

/** 邮箱长度上限 */
export const EMAIL_MAX = 100

/**
 * 校验昵称
 * @returns 不合规时返回 SRS 原文提示，合规返回空串
 */
export function checkNickname(raw: string): string {
  const v = raw.trim()
  if (!v) return '请输入昵称'
  if (v.length < NICKNAME_MIN || v.length > NICKNAME_MAX) return '昵称长度需为 2-20 个字'
  return ''
}

/**
 * 校验选填邮箱
 * @returns 不合规时返回提示，为空或合规返回空串
 */
export function checkOptionalEmail(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (v.length > EMAIL_MAX || !EMAIL_PATTERN.test(v)) return '请输入正确的邮箱地址'
  return ''
}
