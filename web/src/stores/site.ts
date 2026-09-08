import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSiteInfo, type SiteInfo } from '@/api/home'
import { getMenu, type MenuNode } from '@/api/menu'
import { getSeoConfigs, type SeoConfigMap } from '@/api/seo'

/**
 * 站点 store —— 全局共享站点配置、导航菜单与栏目 SEO 配置
 *
 * 存在原因：站点信息与菜单被页眉/页脚/悬浮操作/首页等多处需要，
 * 各自 onMounted 拉取会导致同一接口被重复请求（重构前首页单次加载打 5 次 /api/site/detail）。
 * 此处用「已加载则复用 + 进行中则共享同一 Promise」两级去重，
 * 保证并发挂载的多个组件只触发一次真实请求。
 */
export const useSiteStore = defineStore('site', () => {
  const site = ref<Partial<SiteInfo>>({})
  const menu = ref<MenuNode[]>([])
  const seo = ref<SeoConfigMap>({})
  const siteLoaded = ref(false)
  const menuLoaded = ref(false)
  const seoLoaded = ref(false)

  // 进行中的请求，用于合并并发调用；完成后置回 null
  let sitePending: Promise<void> | null = null
  let menuPending: Promise<void> | null = null
  let seoPending: Promise<void> | null = null

  /**
   * 拉取站点配置（幂等）
   * 已加载直接返回；并发调用共享同一请求；失败不抛出，由调用方按空值降级
   */
  async function fetchSite(): Promise<void> {
    if (siteLoaded.value) return
    if (sitePending) return sitePending

    sitePending = (async () => {
      try {
        const res = await getSiteInfo()
        if (res.code === 0 && res.data) site.value = res.data
      } catch {
        site.value = {}
      } finally {
        siteLoaded.value = true
        sitePending = null
      }
    })()

    return sitePending
  }

  /**
   * 拉取导航菜单（幂等）
   * 语义同 fetchSite
   */
  async function fetchMenu(): Promise<void> {
    if (menuLoaded.value) return
    if (menuPending) return menuPending

    menuPending = (async () => {
      try {
        const res = await getMenu()
        if (res.code === 0 && res.data) menu.value = res.data
      } catch {
        menu.value = []
      } finally {
        menuLoaded.value = true
        menuPending = null
      }
    })()

    return menuPending
  }

  /**
   * 拉取栏目 SEO 配置（幂等）
   * 语义同 fetchSite；失败时留空，由调用方保留页面既有的标题与描述
   */
  async function fetchSeo(): Promise<void> {
    if (seoLoaded.value) return
    if (seoPending) return seoPending

    seoPending = (async () => {
      try {
        const res = await getSeoConfigs()
        if (res.code === 0 && res.data) seo.value = res.data
      } catch {
        seo.value = {}
      } finally {
        seoLoaded.value = true
        seoPending = null
      }
    })()

    return seoPending
  }

  return { site, menu, seo, siteLoaded, menuLoaded, seoLoaded, fetchSite, fetchMenu, fetchSeo }
})
