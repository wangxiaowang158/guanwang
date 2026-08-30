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

/** 管理端真实后端接口的子前缀（相对 DECLARED_API_PREFIX 声明，运行时随 API_PREFIX 改写） */
export const MGMT_SUBPREFIX = '/mgmt'

/** 管理端占位令牌的请求头名称，须与后端 MgmtDevGuard 一致 */
export const MGMT_TOKEN_HEADER = 'x-mgmt-dev-token'

/**
 * 管理端占位令牌
 * 【严禁公网部署】后端未实现管理员认证前的开发期措施，与 server 的 MGMT_DEV_TOKEN 对应
 */
export const MGMT_DEV_TOKEN = (import.meta.env.VITE_MGMT_DEV_TOKEN || '').trim()

/** 解析正数型环境变量，非法值回退默认 */
function toPositiveNumber(value: string | undefined, fallback: number): number {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : fallback
}

/** 图片上传大小上限（MB） */
export const UPLOAD_MAX_MB = toPositiveNumber(import.meta.env.VITE_UPLOAD_MAX_MB, 2)

/** 图片上传大小上限（字节），供体积校验使用 */
export const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024

/**
 * 允许上传的图片 MIME 白名单
 * 显式列举而不用 image/*，避免 svg 等可携带脚本的类型进入富文本
 */
export const UPLOAD_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

/** 文件选择框的 accept 属性值 */
export const UPLOAD_ACCEPT = UPLOAD_IMAGE_MIMES.join(',')

/** 白名单对应的友好格式名，用于错误提示 */
export const UPLOAD_IMAGE_LABEL = 'JPG / PNG / WebP / GIF'
