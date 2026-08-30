// axios 全局配置 —— 基础地址 + 请求注入登录凭证 + 响应统一处理鉴权失效
import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '@/router'
import {
  API_BASE_URL,
  API_PREFIX,
  DECLARED_API_PREFIX,
  MGMT_DEV_TOKEN,
  MGMT_SUBPREFIX,
  MGMT_TOKEN_HEADER,
} from '@/config'

let redirecting = false

/**
 * 接口层统一以 /api 声明路径，此处按配置改写为实际前缀
 * 需精确匹配 /api 命名空间，避免误伤 /apikeys 这类同前缀开头的路径
 */
function rewritePrefix(url: string | undefined): string | undefined {
  if (!url || API_PREFIX === DECLARED_API_PREFIX) return url
  const isApiPath = url === DECLARED_API_PREFIX || url.startsWith(`${DECLARED_API_PREFIX}/`)
  return isApiPath ? API_PREFIX + url.slice(DECLARED_API_PREFIX.length) : url
}

/**
 * 判断是否为走真实后端的管理端接口
 * 需在前缀改写「之后」调用，故按实际生效的 API_PREFIX 匹配
 */
function isMgmtPath(url: string | undefined): boolean {
  if (!url) return false
  const mgmtPrefix = `${API_PREFIX}${MGMT_SUBPREFIX}`
  return url === mgmtPrefix || url.startsWith(`${mgmtPrefix}/`)
}

/** 安装 axios 基础地址与拦截器（在应用启动时调用一次） */
export function setupAxios() {
  // 基础地址：留空即同源相对路径（走 Mock 或开发代理）
  if (API_BASE_URL) {
    axios.defaults.baseURL = API_BASE_URL
  }

  // 请求拦截：改写接口前缀 + 携带 token
  axios.interceptors.request.use((config) => {
    config.url = rewritePrefix(config.url)
    const token = localStorage.getItem('token')
    if (token && token !== 'undefined') {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    // 管理端真实后端接口额外带占位令牌头；管理员登录仍走 Mock，故后端不认 Authorization
    if (MGMT_DEV_TOKEN && isMgmtPath(config.url)) {
      config.headers = config.headers || {}
      config.headers[MGMT_TOKEN_HEADER] = MGMT_DEV_TOKEN
    }
    return config
  })

  // 响应拦截：401/鉴权失效时清理凭证并跳转登录
  axios.interceptors.response.use(
    // 管理端真实后端接口的 401 表示占位令牌配错，与管理员登录态无关，不触发跳登录
    (response) => {
      const code = response.data?.code
      if (code === 401 && !isMgmtPath(response.config?.url)) {
        handleUnauthorized()
      }
      return response
    },
    (error) => {
      if (error.response?.status === 401 && !isMgmtPath(error.config?.url)) {
        handleUnauthorized()
      }
      return Promise.reject(error)
    }
  )
}

// 凭证失效：清理并跳转登录（防重复跳转）
function handleUnauthorized() {
  if (redirecting) return
  redirecting = true
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  message.warning('登录已过期，请重新登录')
  router.push('/login').finally(() => {
    redirecting = false
  })
}
