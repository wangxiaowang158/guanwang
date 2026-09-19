import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import { message } from 'ant-design-vue'
import MainLayout from '@/layouts/MainLayout/index.vue'
import { useChannels } from '@/composables/useChannels'
import { FIXED_MENU_PATHS } from '@/constants/menu'
import { useUserStore } from '@/store'

// 中瑞恒官网后台路由模块
import cmsRoutes from './modules/cms'
import dashboardRoutes from './modules/dashboard'
import statsRoutes from './modules/stats'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: MainLayout,
    // 默认进入数据仪表盘
    redirect: '/dashboard',
    children: [
      ...dashboardRoutes,
      ...statsRoutes,
      ...cmsRoutes
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 判断目标路由对当前管理员是否可访问
 * 栏目页按 channelKey 判权，固定页按可访问清单判权；不在清单内的路径（如 /）交由重定向处理
 */
function resolveAccess(to: RouteLocationNormalized): { allowed: boolean; fallback: string } {
  const { accessiblePaths, landingPath, canVisitChannel } = useChannels()
  const fallback = landingPath()
  const channelKey = to.params.channelKey
  if (typeof channelKey === 'string' && channelKey) {
    return { allowed: canVisitChannel(channelKey), fallback }
  }
  if (FIXED_MENU_PATHS.includes(to.path)) {
    return { allowed: accessiblePaths.value.includes(to.path), fallback }
  }
  return { allowed: true, fallback }
}

// 路由守卫：未登录拦截跳转登录页；已登录则确保权限就绪后按权限放行
router.beforeEach(async (to, from, next) => {
  const rawToken = localStorage.getItem('token')
  // 排除空串/'undefined' 等垃圾值，仅有效 token 视为已登录
  const isAuthenticated = !!rawToken && rawToken !== 'undefined' && rawToken.trim() !== ''

  if (to.meta?.title) {
    document.title = `${to.meta.title} - 中瑞恒后台管理`
  }

  if (to.path === '/login') {
    // 已登录再进登录页直接回首页，未登录正常放行
    return isAuthenticated ? next('/') : next()
  }

  if (!isAuthenticated) {
    // 从已登录的应用内页面跳转过来视为凭证失效，提示重新登录；
    // 首次直接访问（无来源页）则静默跳转，不打扰用户。
    if (from.name) {
      message.warning('登录已过期，请重新登录')
    }
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 刷新页面后内存中的权限会丢失，菜单与路由判权都依赖它，故先补拉
  const userStore = useUserStore()
  const profile = await userStore.ensureProfile()
  if (!profile) {
    userStore.clearUser()
    message.warning('登录已过期，请重新登录')
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 栏目树同时决定菜单与栏目页权限，需在判权前就位
  const { load } = useChannels()
  await load()

  const { allowed, fallback } = resolveAccess(to)
  if (allowed) return next()
  if (!fallback) {
    // 一个菜单都没授权：留在当前页并提示，避免与落地页互相重定向
    message.error('当前账号未被授予任何功能模块权限，请联系管理员')
    return from.name ? next(false) : next()
  }
  message.error('无访问权限')
  return next(fallback)
})

export default router
