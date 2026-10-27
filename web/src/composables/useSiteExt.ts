// 站点扩展配置的全局副作用：灰色模式、第三方统计
// 只在根组件调用一次
//
// 统计脚本地址写死官方域名、只把后台填的 ID 拼进去：网关 CSP 只为这几个域名开了口子（见 docker/nginx/security-headers.conf），
// 任意脚本既跑不起来，也不该跑——后台账号失窃不能升级成全站 XSS。
// 初始化全局队列（_hmt / dataLayer）在本包内完成，不需要内联脚本
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSiteStore } from '@/stores/site'

declare global {
  interface Window {
    _hmt?: unknown[][]
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** 灰色模式样式节点 id；与预渲染 head 输出的同名，网关已注入时不再重复 */
const GRAY_STYLE_ID = 'gray-mode'
/** 与 server/src/modules/cms/prerender-head.builder.ts 的 GRAY_MODE_CSS 一致 */
const GRAY_MODE_CSS = 'html{filter:grayscale(100%);-webkit-filter:grayscale(100%)}'

/** 统计 ID 形态，与后端白名单一致；前台再校验一道，防接口被篡改时拼出别的地址 */
const BAIDU_ID = /^[a-f0-9]{32}$/
const GA_ID = /^G-[A-Z0-9]{4,20}$/

function setGray(on: boolean): void {
  const existing = document.getElementById(GRAY_STYLE_ID)
  if (on && !existing) {
    const style = document.createElement('style')
    style.id = GRAY_STYLE_ID
    style.textContent = GRAY_MODE_CSS
    document.head.appendChild(style)
  } else if (!on && existing) {
    existing.remove()
  }
}

function loadScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return
  const s = document.createElement('script')
  s.src = src
  s.async = true
  document.head.appendChild(s)
}

export function useSiteExt(): void {
  const siteStore = useSiteStore()
  const { site } = storeToRefs(siteStore)
  const router = useRouter()
  let baiduReady = false
  let gaReady = false

  void siteStore.fetchSite()

  watch(
    () => site.value.ext,
    (ext) => {
      if (!ext) return
      setGray(ext.grayActive)

      // 百度统计：hm.js 加载后会自动记一次首屏 PV，之后的站内跳转由下面的 afterEach 补记
      if (!baiduReady && ext.baiduTongji && BAIDU_ID.test(ext.baiduTongji)) {
        window._hmt = window._hmt || []
        loadScript(`https://hm.baidu.com/hm.js?${ext.baiduTongji}`)
        baiduReady = true
      }
      // GA4：关掉自动 page_view，统一由路由钩子发，避免 SPA 下首屏重复计数
      if (!gaReady && ext.gaId && GA_ID.test(ext.gaId)) {
        window.dataLayer = window.dataLayer || []
        // gtag 约定必须 push arguments 对象而非数组，否则 GA 不识别
        window.gtag = function gtag() {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer?.push(arguments)
        }
        window.gtag('js', new Date())
        window.gtag('config', ext.gaId, { send_page_view: false })
        loadScript(`https://www.googletagmanager.com/gtag/js?id=${ext.gaId}`)
        window.gtag('event', 'page_view', { page_location: location.href, page_title: document.title })
        gaReady = true
      }
    },
    { immediate: true },
  )

  // 站内跳转补记 PV；首屏由上面的初始化负责，这里跳过首次导航（from 为初始空路由）
  router.afterEach((to, from) => {
    if (!from.matched.length || to.fullPath === from.fullPath) return
    // 等标题被 useSeo 更新后再上报，统计里看到的才是新页面的标题
    setTimeout(() => {
      if (baiduReady) window._hmt?.push(['_trackPageview', to.fullPath])
      if (gaReady) window.gtag?.('event', 'page_view', { page_location: location.href, page_title: document.title })
    }, 0)
  })
}
