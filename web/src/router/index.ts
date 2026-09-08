import { createRouter, createWebHistory } from 'vue-router'
import { useMemberStore } from '@/stores/member'

declare module 'vue-router' {
  interface RouteMeta {
    /** 该页面需会员登录，未登录跳登录页 */
    requiresMember?: boolean
    /** 该页面仅未登录可见（登录/注册），已登录直接送去会员中心 */
    guestOnly?: boolean
    /**
     * 页面标题，用于非栏目页（栏目页取后台按栏目录入的 SEO 标题）
     * 缺省时回落到基本信息管理的站点标题
     */
    title?: string
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
          meta: { requiresMember: true, title: '会员中心 - 中瑞恒' },
        },
      ],
    },
    // 认证页不套官网布局，用独立的极简外壳
    {
      path: '/member/login',
      name: 'member-login',
      component: () => import('@/views/member/Login.vue'),
      meta: { guestOnly: true, title: '会员登录 - 中瑞恒' },
    },
    {
      path: '/member/register',
      name: 'member-register',
      component: () => import('@/views/member/Register.vue'),
      meta: { guestOnly: true, title: '会员注册 - 中瑞恒' },
    },
    // 找回密码不限登录态：已登录会员也可能需要重置密码
    {
      path: '/member/forgot',
      name: 'member-forgot',
      component: () => import('@/views/member/Forgot.vue'),
      meta: { title: '找回密码 - 中瑞恒' },
    },
    // 未匹配路由回首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/** 守卫等待资料恢复的上限；超时后按本地令牌乐观放行，避免导航悬停 */
const RESTORE_TIMEOUT = 6000

/**
 * 等待登录态恢复，最多等 RESTORE_TIMEOUT
 * 恢复请求可能挂起（弱网/代理卡死而非直接报错），超时不取消恢复、仅停止等待，
 * 避免导航长时间悬停；无本地令牌时 store 内部直接返回，不产生网络请求
 * @param store 会员 store 实例
 */
async function waitRestore(store: ReturnType<typeof useMemberStore>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      store.restore(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, RESTORE_TIMEOUT)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * 会员路由守卫
 * 需登录的页面先等 store 用本地令牌换回资料，避免刷新页面时被误判为未登录，
 * 仍未登录则跳登录页并带上来源地址；
 * 登录/注册页反向处理，已登录直接送去会员中心（在守卫层拦下，避免先渲染表单再跳走的闪屏）
 */
router.beforeEach(async (to) => {
  if (!to.meta.requiresMember && !to.meta.guestOnly) return true

  const memberStore = useMemberStore()
  await waitRestore(memberStore)

  if (to.meta.guestOnly) {
    // 令牌失效时 restore 已清空登录态，此处会放行，不会与下面的守卫互相弹跳
    return memberStore.isLoggedIn ? { name: 'member-center' } : true
  }

  if (memberStore.isLoggedIn) return true
  return { name: 'member-login', query: { redirect: to.fullPath } }
})

export default router
