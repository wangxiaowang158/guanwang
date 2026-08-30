/**
 * Mock 数据注册
 * 使用 mockjs 在浏览器端拦截 XHR 请求
 * 开关由 setup.ts 依据 VITE_USE_MOCK 判定，本模块只负责注册
 */
import Mock from 'mockjs'
import { API_PREFIX, DECLARED_API_PREFIX } from '@/config'

// 中瑞恒官网管理后台 mock 模块
import authMocks from '../../mock/auth'
import channelMocks from '../../mock/channel'
import contentMocks from '../../mock/content'
import siteMocks from '../../mock/site'
import adminMocks from '../../mock/admin'
import dashboardMocks from '../../mock/dashboard'
import visitStatsMocks from '../../mock/visitStats'

/**
 * 把 mock 声明的 /api 前缀换成实际配置前缀，使 Mock 跟随 VITE_API_PREFIX
 * 边界判断与 utils/request.ts 的 rewritePrefix 保持一致
 */
function applyPrefix(url: string): string {
  if (API_PREFIX === DECLARED_API_PREFIX) return url
  const isApiPath = url === DECLARED_API_PREFIX || url.startsWith(`${DECLARED_API_PREFIX}/`)
  return isApiPath ? API_PREFIX + url.slice(DECLARED_API_PREFIX.length) : url
}

/** 注册全部 mock 接口（由 setup.ts 在开关开启时调用） */
export function registerMocks() {
  Mock.setup({ timeout: '100-300' })

  const allMocks = [
    ...authMocks,
    ...channelMocks,
    ...contentMocks,
    ...siteMocks,
    ...adminMocks,
    ...dashboardMocks,
    ...visitStatsMocks,
  ]

  allMocks.forEach(({ url: declaredUrl, method, response }) => {
    const url = applyPrefix(declaredUrl)
    const urlPattern = new RegExp(url.replace(/:(\w+)/g, '([^/]+)'))
    const httpMethod = (method || 'get').toLowerCase()

    Mock.mock(urlPattern, httpMethod, (options: any) => {
      let body = {}
      let query: Record<string, string> = {}
      let params: Record<string, string> = {}

      if (options.body) {
        try { body = JSON.parse(options.body) } catch { body = {} }
      }

      const urlObj = new URL(options.url, 'http://localhost')
      urlObj.searchParams.forEach((value, key) => { query[key] = value })

      const match = options.url.match(urlPattern)
      const paramNames = (url.match(/:(\w+)/g) || []).map((p: string) => p.slice(1))
      paramNames.forEach((name: string, idx: number) => {
        if (match && match[idx + 1]) params[name] = match[idx + 1]
      })

      // response 由各 mock 模块提供，入参形态不一，统一按通用签名调用
      return (response as (arg: { body: unknown; query: unknown; params: unknown; headers: unknown }) => unknown)({ body, query, params, headers: {} })
    })
  })
}
