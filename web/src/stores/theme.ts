import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useSiteStore } from './site'

/** 网站模板取值 */
export type TemplateKey = '1' | '2' | '3'

/**
 * 整站色调：三套模板共用一套组件与视觉规则，只在色调上区分
 * dark 整站深色 | light 整站浅色 | mixed 浅色为主、首屏与重点区块深色交替
 */
export type SiteTone = 'dark' | 'light' | 'mixed'

const TONE_OF: Record<TemplateKey, SiteTone> = { '1': 'dark', '2': 'light', '3': 'mixed' }

/** 浏览器顶栏 / 地址栏底色，与各色调页面底色一致 */
const THEME_COLOR: Record<SiteTone, string> = { dark: '#000000', light: '#ffffff', mixed: '#000000' }

/** 上次的色调存在本地：下次打开在模板确定前就按它铺底色，深色站不先闪一下白 */
const TONE_CACHE_KEY = 'zrh-site-tone'

/** 等待站点配置确定模板的上限，超时按样式一先渲染 */
const THEME_WAIT_MS = 3000

/** 校验外部数据，非法时回退样式一 */
function normalize(value: unknown): TemplateKey {
  return value === '2' || value === '3' ? value : '1'
}

/**
 * 把色调写到根节点：CSS 按 html[data-tone] 切色板；
 * 深色时加 .dark，Element Plus 的暗色变量（theme-chalk/dark/css-vars.css）据此生效
 */
export function applySiteTone(tone: SiteTone): void {
  const root = document.documentElement
  root.dataset.tone = tone
  root.classList.toggle('dark', tone === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[tone])
}

/** 应用挂载前调用：按上次缓存的色调先铺底色；缓存不存在或非法时不动 */
export function applyCachedSiteTone(): void {
  try {
    const cached = localStorage.getItem(TONE_CACHE_KEY)
    if (cached === 'dark' || cached === 'light' || cached === 'mixed') applySiteTone(cached)
  } catch {
    // 隐私模式等禁用存储的环境：不预铺，等模板确定后再切
  }
}

/**
 * 主题 store —— 决定前台启用哪套模板
 * 数据源：站点配置 /api/site/detail 的 template 字段
 * '1' 样式一（深色，默认）| '2' 样式二（浅色）| '3' 样式三（黑白交替）
 * 样式二沿用自己的一组页头 / 页脚 / 区块组件；样式一与三共用一组，只是色调不同
 */
export const useThemeStore = defineStore('theme', () => {
  const template = ref<TemplateKey>('1')
  const loaded = ref(false)

  /** 是否使用样式二那组组件（只决定组件结构，色调看 tone） */
  const isStyle2 = computed(() => template.value === '2')
  const tone = computed<SiteTone>(() => TONE_OF[template.value])

  // 模板确定后才写根节点：store 刚建时 template 是默认值 '1'，立即写会把挂载前按缓存铺好的色调冲掉
  watch([tone, loaded], ([t, ready]) => {
    if (!ready) return
    applySiteTone(t)
    try { localStorage.setItem(TONE_CACHE_KEY, t) } catch { /* 存不了就下次再闪一次 */ }
  })

  /**
   * 读取 URL 的 ?template= 预览覆盖，仅开发环境生效
   * 正式环境若也认它，任何人发一条带参数的链接就能让访客看到另一套风格，
   * 与后台「网站模板」配置口径不一致（SRS 3.5.1：风格以后台配置为准）
   */
  function readPreviewOverride(): TemplateKey | null {
    if (!import.meta.env.DEV) return null
    const v = new URLSearchParams(window.location.search).get('template')
    return v === '1' || v === '2' || v === '3' ? v : null
  }

  /**
   * 确定当前模板；URL 预览参数优先，其次后台配置，失败回退样式一
   * 站点配置经 site store 获取，与其它组件共享同一次请求
   */
  async function loadTheme() {
    const override = readPreviewOverride()
    if (override) {
      template.value = override
      loaded.value = true
      return
    }
    const siteStore = useSiteStore()
    // 根组件在模板确定前不渲染页面，站点接口挂起（弱网/代理卡死）不能让整站白屏：
    // 超时后按样式一放行，站点配置晚到时再切过去
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      siteStore.fetchSite(),
      new Promise<void>((resolve) => { timer = setTimeout(resolve, THEME_WAIT_MS) }),
    ])
    if (timer) clearTimeout(timer)
    template.value = normalize(siteStore.site.template)
    loaded.value = true
    if (!siteStore.siteLoaded) {
      void siteStore.fetchSite().then(() => { template.value = normalize(siteStore.site.template) })
    }
  }

  return { template, loaded, isStyle2, tone, loadTheme }
})
