import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSiteStore } from './site'

/** 网站模板取值 */
export type TemplateKey = '1' | '2'

/** 等待站点配置确定模板的上限，超时按样式一先渲染 */
const THEME_WAIT_MS = 3000

/**
 * 主题 store —— 决定前台启用哪套模板
 * 数据源：站点配置 /api/site/detail 的 template 字段
 * '1' 样式一（深蓝科技风，默认）| '2' 样式二（集团品牌风）
 */
export const useThemeStore = defineStore('theme', () => {
  const template = ref<TemplateKey>('1')
  const loaded = ref(false)

  const isStyle2 = computed(() => template.value === '2')

  /** 校验外部返回的模板值，非法时回退样式一 */
  function normalize(value: unknown): TemplateKey {
    return value === '2' ? '2' : '1'
  }

  /**
   * 读取 URL 的 ?template= 预览覆盖，仅开发环境生效
   * 正式环境若也认它，任何人发一条带参数的链接就能让访客看到另一套风格，
   * 与后台「网站模板」配置口径不一致（SRS 3.5.1：风格以后台配置为准）
   */
  function readPreviewOverride(): TemplateKey | null {
    if (!import.meta.env.DEV) return null
    const v = new URLSearchParams(window.location.search).get('template')
    if (v === '1' || v === '2') return v
    return null
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

  return { template, loaded, isStyle2, loadTheme }
})
