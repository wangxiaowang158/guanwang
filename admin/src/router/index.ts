import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { message } from 'ant-design-vue'
import MainLayout from '@/layouts/MainLayout/index.vue'

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

// 路由守卫：未登录拦截跳转登录页；凭证失效自动跳转并提示
router.beforeEach((to, from, next) => {
  const rawToken = localStorage.getItem('token')
  // 排除空串/'undefined' 等垃圾值，仅有效 token 视为已登录
  const isAuthenticated = !!rawToken && rawToken !== 'undefined' && rawToken.trim() !== ''

  if (to.meta?.title) {
    document.title = `${to.meta.title} - 中瑞恒后台管理`
  }

  if (to.path !== '/login' && !isAuthenticated) {
    // 从已登录的应用内页面跳转过来视为凭证失效，提示重新登录；
    // 首次直接访问（无来源页）则静默跳转，不打扰用户。
    if (from.name) {
      message.warning('登录已过期，请重新登录')
    }
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.path === '/login' && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
