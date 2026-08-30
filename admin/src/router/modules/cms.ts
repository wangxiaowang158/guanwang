// CMS 路由 —— 单一调度视图按栏目 type 渲染对应页面
import type { RouteRecordRaw } from 'vue-router'

const cmsRoutes: RouteRecordRaw[] = [
  {
    // 栏目主视图：list→列表 / single→单条编辑 / siteconfig / messages / admins
    path: '/cms/:channelKey',
    name: 'CmsView',
    component: () => import('@/views/Cms/CmsView.vue'),
    meta: { title: '内容管理' }
  },
  {
    // list 栏目的新增/编辑全页表单
    path: '/cms/:channelKey/edit/:id?',
    name: 'CmsEdit',
    component: () => import('@/views/Cms/ContentEdit.vue'),
    meta: { title: '编辑' }
  },
  {
    // 栏目管理（可视化增删改菜单结构）
    path: '/channel-manage',
    name: 'ChannelManage',
    component: () => import('@/views/Cms/ChannelManage.vue'),
    meta: { title: '栏目管理' }
  }
]

export default cmsRoutes
