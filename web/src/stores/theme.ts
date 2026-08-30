import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSiteStore } from './site'

/** 网站模板取值 */
export type TemplateKey = '1' | '2'

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

  /** 读取 URL 的 ?template= 预览覆盖（仅用于开发预览，正式以后台配置为准） */
  function readPreviewOverride(): TemplateKey | null {
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
    await siteStore.fetchSite()
    template.value = normalize(siteStore.site.template)
    loaded.value = true
  }

  return { template, loaded, isStyle2, loadTheme }
})
