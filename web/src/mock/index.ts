// Mock 数据注册 —— 拦截 window.fetch 返回本地数据
// 开关由 setup.ts 依据 VITE_USE_MOCK 判定，本模块只负责注册
import { API_PREFIX, DECLARED_API_PREFIX } from '@/config'
import { siteInfo, aboutSection, philosophySection } from './siteData'
import {
  businessList, productList, serviceList,
  partnerList, achievementList, socialList
} from './sectionData'
import { menuTree } from './menu'
import { pageContents } from './pageData'
import { homeBackgrounds, pageHeroBackgrounds } from './backgrounds'
import { seoConfigs } from './seoData'

/** 注册 fetch 拦截与全部 mock 路由（由 setup.ts 在开关开启时调用） */
export function registerMocks() {
  const mockRoutes: Record<string, Record<string, (body?: unknown, query?: Record<string, string>) => unknown>> = {
    POST: {
      // 留言提交已改走真实后端 /api/portal/feedback/*，此处不再拦截
      // 访问记录（埋点，仅返回成功，无副作用）
      '/api/visit/record': () => ({ code: 0, data: null, message: 'ok' }),
    },
    GET: {
      // 站点基本信息
      '/api/site/detail': () => ({ code: 0, data: siteInfo, message: 'ok' }),
      // 前台首页聚合数据（各板块一次返回，前台只读展示）
      '/api/home/sections': () => ({
        code: 0,
        message: 'ok',
        data: {
          about: aboutSection,
          philosophy: philosophySection,
          business: [...businessList].sort((a, b) => a.sort - b.sort),
          products: [...productList].sort((a, b) => a.sort - b.sort),
          services: serviceList,
          partners: [...partnerList].sort((a, b) => a.sort - b.sort),
          achievements: [...achievementList].sort((a, b) => a.sort - b.sort),
          social: [...socialList].sort((a, b) => a.sort - b.sort),
          backgrounds: homeBackgrounds,
        },
      }),
      // 前台导航菜单（对外栏目树）
      '/api/web/menu': () => ({ code: 0, message: 'ok', data: menuTree }),
      // 栏目页 SEO 配置（后台按栏目录入，前台一次取全量后按路由取用）
      '/api/web/seo': () => ({ code: 0, message: 'ok', data: seoConfigs }),
      // 栏目页内容（按 key 取数，key 为一级栏目标识）；按需注入演示背景图
      '/api/page': (_body, query) => {
        const key = query?.key || ''
        const content = pageContents[key]
        if (!content) return { code: 404, message: '栏目不存在', data: null }
        const bg = pageHeroBackgrounds[key]
        const data = bg ? { ...content, hero: { ...content.hero, bg } } : content
        return { code: 0, message: 'ok', data }
      },
    },
  }

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    const method = (init?.method || 'GET').toUpperCase()
    // 拆分 path 与 query，path 用于路由匹配，query 透传给 handler
    const [path, queryStr] = rawUrl.split('?')
    const pathname = path.replace(/^https?:\/\/[^/]+/, '')
    const query: Record<string, string> = {}
    if (queryStr) {
      new URLSearchParams(queryStr).forEach((v, k) => { query[k] = v })
    }
    // 路由表以 /api 声明，实际前缀被改写时还原回声明形式再匹配
    // 精确匹配前缀命名空间，避免误伤同前缀开头的其它路径
    const isPrefixed = pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`)
    const routeKey =
      API_PREFIX !== DECLARED_API_PREFIX && isPrefixed
        ? DECLARED_API_PREFIX + pathname.slice(API_PREFIX.length)
        : pathname
    const handler = mockRoutes[method]?.[routeKey]

    if (handler) {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 200))
      let body: unknown
      if (init?.body) {
        try { body = JSON.parse(init.body as string) } catch { body = init.body }
      }
      const data = handler(body, query)
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return originalFetch(input, init)
  }
}
