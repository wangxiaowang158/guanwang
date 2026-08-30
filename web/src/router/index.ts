import { createRouter, createWebHistory } from 'vue-router'
import { useMemberStore } from '@/stores/member'

declare module 'vue-router' {
  interface RouteMeta {
    /** 该页面需会员登录，未登录跳登录页 */
    requiresMember?: boolean
  }
}

// 前台官网路由 —— 对齐后台对外栏目（首页 + 8 个一级栏目页）+ 会员页
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/components/layout/DefaultLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/home/index.vue') },
        { path: 'hvac', name: 'hvac', component: () => import('@/views/hvac/index.vue') },
        { path: 'energy', name: 'energy', component: () => import('@/views/energy/index.vue') },
        { path: 'smart', name: 'smart', component: () => import('@/views/smart/index.vue') },
        { path: 'household', name: 'household', component: () => import('@/views/household/index.vue') },
        { path: 'case', name: 'case', component: () => import('@/views/case/index.vue') },
        { path: 'news', name: 'news', component: () => import('@/views/news/index.vue') },
        { path: 'alliance', name: 'alliance', component: () => import('@/views/alliance/index.vue') },
        { path: 'about', name: 'about', component: () => import('@/views/about/index.vue') },
        // 会员中心随官网顶栏一起呈现，需登录
        {
          path: 'member/center',
          name: 'member-center',
          component: () => import('@/views/member/center/index.vue'),
          meta: { requiresMember: true },
        },
      ],
    },
    // 认证页不套官网布局，用独立的极简外壳
    { path: '/member/login', name: 'member-login', component: () => import('@/views/member/Login.vue') },
    { path: '/member/register', name: 'member-register', component: () => import('@/views/member/Register.vue') },
    { path: '/member/forgot', name: 'member-forgot', component: () => import('@/views/member/Forgot.vue') },
    // 未匹配路由回首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/**
 * 会员路由守卫
 * 需登录的页面先等 store 用本地令牌换回资料，避免刷新页面时被误判为未登录；
 * 未登录则跳登录页并带上来源地址
 */
router.beforeEach(async (to) => {
  if (!to.meta.requiresMember) return true

  const memberStore = useMemberStore()
  await memberStore.restore()
  if (memberStore.isLoggedIn) return true

  return { name: 'member-login', query: { redirect: to.fullPath } }
})

export default router
