// 访问统计路由
import type { RouteRecordRaw } from 'vue-router'

const statsRoutes: RouteRecordRaw[] = [
  {
    path: '/visit-stats',
    name: 'VisitStats',
    component: () => import('@/views/VisitStats/index.vue'),
    meta: { title: '访问统计' }
  }
]

export default statsRoutes
