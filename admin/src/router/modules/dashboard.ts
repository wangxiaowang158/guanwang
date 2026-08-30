// 数据仪表盘路由 —— 登录后默认落地页
import type { RouteRecordRaw } from 'vue-router'

const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard/index.vue'),
    meta: { title: '数据仪表盘' }
  }
]

export default dashboardRoutes
