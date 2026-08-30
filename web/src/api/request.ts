// 前台统一请求封装 —— 基于 fetch，约定响应 { code, data, message }，code:0 表成功
// 避免各处裸写 fetch，统一错误处理与 JSON 解析
import { API_BASE_URL, API_PREFIX, DECLARED_API_PREFIX, MEMBER_TOKEN_KEY } from '@/config'

/** 后端统一响应结构 */
export interface ApiResult<T = unknown> {
  code: number
  data: T
  message: string
}

/**
 * 按配置解析请求地址
 * 接口层统一以 /api 声明路径，此处改写为实际前缀并拼接基础地址
 * 需精确匹配 /api 命名空间，避免误伤 /apikeys 这类同前缀开头的路径
 * @param url 接口层声明的相对路径
 */
function resolveUrl(url: string): string {
  const isApiPath = url === DECLARED_API_PREFIX || url.startsWith(`${DECLARED_API_PREFIX}/`)
  const path =
    API_PREFIX !== DECLARED_API_PREFIX && isApiPath
      ? API_PREFIX + url.slice(DECLARED_API_PREFIX.length)
      : url
  return API_BASE_URL ? API_BASE_URL + path : path
}

/** GET 请求；失败抛出 Error，由调用方捕获 */
export async function get<T>(url: string): Promise<ApiResult<T>> {
  const res = await fetch(resolveUrl(url), { method: 'GET' })
  if (!res.ok) throw new Error(`请求失败：${res.status}`)
  return res.json() as Promise<ApiResult<T>>
}

/** POST 请求（JSON body）；失败抛出 Error，由调用方捕获 */
export async function post<T>(url: string, body?: unknown): Promise<ApiResult<T>> {
  const res = await fetch(resolveUrl(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`请求失败：${res.status}`)
  return res.json() as Promise<ApiResult<T>>
}

/**
 * 读取会员令牌
 * 从 localStorage 直读而非依赖 store，避免 store → api → request → store 的循环引用
 */
function memberToken(): string {
  return localStorage.getItem(MEMBER_TOKEN_KEY) || ''
}

/** 拼装请求头，有会员令牌时附加 Authorization */
function authHeaders(withBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {}
  if (withBody) headers['Content-Type'] = 'application/json'
  const token = memberToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/**
 * 会员接口请求（自动携带令牌）
 * 后端对凭证问题返回 HTTP 200 + code 401，故 401 不会走 !res.ok 分支，
 * 由调用方按 code 判断；仅网络层错误抛出 Error
 * @param method HTTP 方法
 * @param url 接口层声明的相对路径
 * @param body 请求体，GET 与 DELETE 不传
 */
export async function authRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const hasBody = body !== undefined
  const res = await fetch(resolveUrl(url), {
    method,
    headers: authHeaders(hasBody),
    body: hasBody ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`请求失败：${res.status}`)
  return res.json() as Promise<ApiResult<T>>
}
