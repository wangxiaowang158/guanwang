// 素材库路由
import type { RouteRecordRaw } from 'vue-router'

const mediaRoutes: RouteRecordRaw[] = [
  {
    path: '/media',
    name: 'MediaLibrary',
    component: () => import('@/views/Media/index.vue'),
    meta: { title: '素材库' }
  }
]

export default mediaRoutes
