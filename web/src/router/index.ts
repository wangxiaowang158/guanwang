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
    /**
     * 禁止搜索引擎收录该页面，由 useSeo 输出 robots meta
     * 404 页必须置此项：不然它会以各种错误地址被反复收录
     */
    noindex?: boolean
  }
}

/** 等待锚点元素出现的上限：栏目页内容异步加载，元素晚于路由切换出现 */
const ANCHOR_WAIT_MS = 3000

/** 锚点定位时让出的顶部距离：固定顶栏（样式二最高 76px）+ 12px 呼吸 */
const ANCHOR_OFFSET = 88

/**
 * 等待锚点元素渲染出来
 * @param selector 路由 hash，如 #product
 * @returns 找到时 resolve true，超时 resolve false
 */
function waitForAnchor(selector: string): Promise<boolean> {
  const id = decodeURIComponent(selector.slice(1))
  const start = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      if (document.getElementById(id)) return resolve(true)
      if (performance.now() - start > ANCHOR_WAIT_MS) return resolve(false)
      requestAnimationFrame(check)
    }
    check()
  })
}

/**
 * 等待页面高度至少达到目标值，超时即放弃等待
 * @param minHeight 目标文档高度（px）
 */
function waitForHeight(minHeight: number): Promise<void> {
  const start = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      const enough = document.documentElement.scrollHeight >= minHeight
      if (enough || performance.now() - start > ANCHOR_WAIT_MS) return resolve()
      requestAnimationFrame(check)
    }
    check()
  })
}

// 注意：新增前台路由须同步 docker/nginx/gateway.conf 的已知路由正则，
// 否则网关会对该地址返回 404 状态码（页面仍能渲染，但搜索引擎不收录）
// 前台官网路由 —— 对齐后台对外栏目（首页 + 8 个一级栏目页）+ 会员页
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  /**
   * 滚动行为：前进后退恢复原位置；带锚点等内容渲染后定位（顶栏遮挡由 scroll-padding-top 补偿）；
   * 同一页面只改查询串（翻页、切分类）时不动滚动位置，由页面自己定位到对应内容块
   */
  async scrollBehavior(to, from, saved) {
    if (saved) {
      // 从详情返回栏目页时内容是重新异步加载的，页面还没撑到原高度就滚会停在半路
      await waitForHeight(saved.top + window.innerHeight)
      return saved
    }
    if (to.hash) {
      const found = await waitForAnchor(to.hash)
      // vue-router 按 el 定位时内部用 window.scrollTo，不吃 html 的 scroll-padding-top，
      // 固定顶栏的遮挡得在这里显式让出（与 style.css 的 scroll-padding-top 同值）
      return found ? { el: to.hash, top: ANCHOR_OFFSET, behavior: 'smooth' } : { top: 0 }
    }
    if (to.path === from.path) return false
    return { top: 0 }
  },
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
        // 文章详情：新闻/案例等有正文的内容公用一条路由，标题与 SEO 由页面按内容动态写入
        {
          path: 'article/:id',
          name: 'article',
          component: () => import('@/views/article/index.vue'),
        },
        // 隐私政策：留言表单与会员注册都收集个人信息，需有常驻告知页
        // 不做成后台栏目：栏目一旦配 portalPath 就会进主导航，而法务页应只在页脚出现
        {
          path: 'privacy',
          name: 'privacy',
          component: () => import('@/views/legal/Privacy.vue'),
          meta: { title: '隐私政策 - 中瑞恒' },
        },
        // 会员中心随官网顶栏一起呈现，需登录
        {
          path: 'member/center',
          name: 'member-center',
          component: () => import('@/views/member/center/index.vue'),
          meta: { requiresMember: true, title: '会员中心 - 中瑞恒' },
        },
        // 未匹配地址：套官网壳展示 404，不再 redirect 到首页。
        // 原先跳首页有两个实际损失：用户不知道自己点错了地址，
        // 且搜索引擎会把大量错误地址当成首页的重复内容收录。
        // 放在 children 里是为了带上页眉页脚，用户能直接导航去别处
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/views/error/NotFound.vue'),
          meta: { title: '页面不存在 - 中瑞恒', noindex: true },
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
