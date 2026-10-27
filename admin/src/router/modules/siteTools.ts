// 站点工具路由 —— 跳转规则、数据备份
import type { RouteRecordRaw } from 'vue-router'

const siteToolsRoutes: RouteRecordRaw[] = [
  {
    path: '/site-tools',
    name: 'SiteTools',
    component: () => import('@/views/SiteTools/index.vue'),
    meta: { title: '站点工具' }
  }
]

export default siteToolsRoutes
