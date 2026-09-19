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

/** 接口层硬编码声明的前缀，运行时按 API_PREFIX 改写 */
export const DECLARED_API_PREFIX = '/api'

/** 接口路径前缀，与后端及代理规则保持一致 */
export const API_PREFIX = normalizePrefix(import.meta.env.VITE_API_PREFIX, DECLARED_API_PREFIX)

/** 接口基础地址；空串表示同源相对路径（走开发代理或同源部署） */
export const API_BASE_URL = trimTrailingSlash((import.meta.env.VITE_API_BASE_URL || '').trim())

/**
 * 登录接口子路径（相对 API_PREFIX 声明，运行时随 API_PREFIX 改写）
 * 响应拦截器据此放行登录失败的 401 —— 那是凭证错误，应留在登录页提示，不能触发跳登录
 */
export const LOGIN_SUBPATH = '/mgmt/auth/login'

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

/** 视频上传大小上限（MB），与后端 UPLOAD_VIDEO_MAX_MB 保持一致 */
export const UPLOAD_VIDEO_MAX_MB = toPositiveNumber(import.meta.env.VITE_UPLOAD_VIDEO_MAX_MB, 100)

/** 视频上传大小上限（字节），供体积校验使用 */
export const UPLOAD_VIDEO_MAX_BYTES = UPLOAD_VIDEO_MAX_MB * 1024 * 1024

/**
 * 允许上传的视频 MIME 白名单
 * 只收浏览器能直接用 video 标签播的容器格式，avi/mov/wmv 需转码，不在此列
 */
export const UPLOAD_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/ogg'] as const

/** 视频文件选择框的 accept 属性值 */
export const UPLOAD_VIDEO_ACCEPT = UPLOAD_VIDEO_MIMES.join(',')

/** 视频白名单对应的友好格式名，用于错误提示 */
export const UPLOAD_VIDEO_LABEL = 'MP4 / WebM / Ogg'
