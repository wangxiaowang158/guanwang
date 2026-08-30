// 运行时配置 —— 收敛 import.meta.env 的读取，业务代码只依赖此模块，不直接读 env
// 构建期配置（端口/代理）见 build/env.ts

/**
 * 规范化路径前缀：确保以 / 开头且不以 / 结尾
 * 空值视为未配置并回退默认；需要「无前缀」时配 VITE_API_PREFIX=/ （规范化后得空串）
 */
function normalizePrefix(value: string | undefined, fallback: string): string {
  const raw = (value || '').trim() || fallback
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

/** 去掉末尾斜杠，避免与接口路径拼接出双斜杠 */
function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/** 接口层与 mock 中硬编码声明的前缀，运行时按 API_PREFIX 改写 */
export const DECLARED_API_PREFIX = '/api'

/** 接口路径前缀，与后端及代理规则保持一致 */
export const API_PREFIX = normalizePrefix(import.meta.env.VITE_API_PREFIX, DECLARED_API_PREFIX)

/** 接口基础地址；空串表示同源相对路径（走 Mock 或开发代理） */
export const API_BASE_URL = trimTrailingSlash((import.meta.env.VITE_API_BASE_URL || '').trim())

/** 会员令牌在 localStorage 中的键名 */
export const MEMBER_TOKEN_KEY = 'zrh_member_token'

/**
 * 真实后端的业务成功码
 * 注意：既有 Mock 接口沿用 code:0，两者不可混用——
 * 走 /api/portal/* 的会员接口一律判此值
 */
export const REAL_API_SUCCESS_CODE = 200
