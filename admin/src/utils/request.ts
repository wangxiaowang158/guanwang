// axios 全局配置 —— 基础地址 + 请求注入登录凭证 + 响应统一处理鉴权失效
import axios from 'axios'
import { message } from 'ant-design-vue'
import router from '@/router'
import { API_BASE_URL, API_PREFIX, DECLARED_API_PREFIX, LOGIN_SUBPATH } from '@/config'
import { useUserStore } from '@/store'

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
 * 判断是否为登录接口自身
 * 登录返回的 401 表示账号密码错误，须留在登录页提示，不能当作登录态失效去跳转；
 * 需在前缀改写「之后」调用，故按实际生效的 API_PREFIX 匹配
 */
function isLoginPath(url: string | undefined): boolean {
  if (!url) return false
  // 去掉查询串再比对，避免带参调用漏判
  const path = url.split('?')[0]
  return path === `${API_PREFIX}${LOGIN_SUBPATH}`
}

/** 安装 axios 基础地址与拦截器（在应用启动时调用一次） */
export function setupAxios() {
  // 基础地址：留空即同源相对路径（走开发代理或同源部署）
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
    return config
  })

  // 响应拦截：401 表示管理员令牌缺失或已过期，清理凭证并跳转登录
  // 后端异常统一包装为 HTTP 200 + 响应体 code，故两种失效都命中此分支
  axios.interceptors.response.use(
    (response) => {
      const code = response.data?.code
      if (code === 401 && !isLoginPath(response.config?.url)) {
        handleUnauthorized()
      }
      // 403 为后端菜单级权限拦截；页面只判 code:200 会静默空白，故在此统一提示
      if (code === 403) {
        message.error(response.data?.message || '无访问权限')
      }
      return response
    },
    (error) => {
      if (error.response?.status === 401 && !isLoginPath(error.config?.url)) {
        handleUnauthorized()
      }
      return Promise.reject(error)
    }
  )
}

// 凭证失效：清理并跳转登录（防重复跳转）
// 复用 store 的 clearUser，让「登录态失效」只有一个清理出口，避免内存 userInfo 残留
function handleUnauthorized() {
  if (redirecting) return
  redirecting = true
  useUserStore().clearUser()
  message.warning('登录已过期，请重新登录')
  router.push('/login').finally(() => {
    redirecting = false
  })
}
