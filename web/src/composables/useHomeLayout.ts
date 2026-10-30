// 首页板块布局 composable —— 按后台「首页布局」决定渲染哪些板块、什么顺序、什么标题与底色
// 两套首页模板共用：Style1Home / Style2Home 把结果交给 HomeSectionList 渲染，首屏「了解业务」按钮跳到第一个板块
import { computed, type Ref } from 'vue'
import type { HomeSectionConfig, HomeSectionKey, HomeSections, HomeTone, SiteInfo } from '@/api/home'
import type { PageItem } from '@/api/page'
import type { BusinessBrief } from './useHomeShowcase'
import { useHomeCopy } from './useHomeCopy'
import type { SiteTone } from '@/stores/theme'

/** 后台未保存过布局（或接口还没返回）时的顺序，与后端 HOME_SECTIONS 一致 */
const DEFAULT_ORDER: HomeSectionKey[] = ['business-trio', 'advantage', 'case', 'news', 'partner', 'view', 'contact']

/** 栏目型板块 → useHomeCopy 的板块标识：标题回落到栏目名 / 区块副标题（栏目管理里改） */
const CHANNEL_HEADING: Partial<Record<HomeSectionKey, string>> = {
  advantage: 'advantage',
  partner: 'partner',
  view: 'view',
}

/** 实际渲染的板块 */
export interface RenderedSection {
  key: HomeSectionKey
  eyebrow?: string
  title?: string
  tone: Exclude<HomeTone, 'auto'>
}

export function useHomeLayout(
  sections: Ref<HomeSections | null>,
  site: Ref<Partial<SiteInfo>>,
  briefs: Ref<BusinessBrief[]>,
  news: Ref<PageItem[]>,
  cases: Ref<PageItem[]>,
  /**
   * 整站色调：mixed（样式三）时 auto 块在「白 / 黑」间交替，否则在「浅灰 / 白」间交替；
   * dark（样式一）时白底与深色底同为纯黑，比较相邻块时把 dark 视同 white，免得连成一片
   */
  siteTone: () => SiteTone = () => 'light',
) {
  const { heading, contactHeading } = useHomeCopy(sections, site)

  /** 板块是否有内容可渲染；联系板块恒有 */
  const hasContent = (key: HomeSectionKey): boolean => {
    switch (key) {
      case 'business-trio': return briefs.value.length > 0
      case 'advantage': return !!sections.value?.advantages?.length
      case 'case': return cases.value.length > 0
      case 'news': return news.value.length > 0
      case 'partner': return !!sections.value?.partners?.length
      case 'view': return !!sections.value?.views?.length
      case 'contact': return true
    }
  }

  /** 标题：首页布局里填了用布局的；栏目型板块取栏目配置；都没有交给组件内置文案 */
  const headingOf = (cfg: HomeSectionConfig) => {
    const channel = CHANNEL_HEADING[cfg.key]
    const base = cfg.key === 'contact'
      ? contactHeading.value
      : channel ? heading(channel) : { eyebrow: '', title: '' }
    return { eyebrow: cfg.eyebrow || base.eyebrow || undefined, title: cfg.title || base.title || undefined }
  }

  const layout = computed<HomeSectionConfig[]>(() =>
    site.value.homeLayout?.length
      ? site.value.homeLayout
      : DEFAULT_ORDER.map(key => ({ key, visible: true, tone: 'auto' as const })),
  )

  /**
   * 实际渲染的板块：剔除关闭的与没内容的，再给 auto 底色与相邻块错开
   * 与栏目页 ChannelPage 同一算法：auto 块先看上一块实际底色（上一块浅色则白，否则浅色），
   * 再避开下一块指定的底色；首块默认浅色，与深色首屏拉开层次
   */
  const rendered = computed<RenderedSection[]>(() => {
    const list = layout.value.filter(cfg => cfg.visible && hasContent(cfg.key))
    // 交替的两种底色：样式三首屏是黑，首块白、再黑白相间；其余首块浅灰、再白灰相间
    const t = siteTone()
    const [first, second]: RenderedSection['tone'][] = t === 'mixed' ? ['white', 'dark'] : ['surface', 'white']
    // 深色站里 white 与 dark 渲染出来都是纯黑，按「看起来的颜色」比较
    const look = (x?: HomeTone) => (t === 'dark' && x === 'dark' ? 'white' : x)
    const out: RenderedSection[] = []
    list.forEach((cfg, i) => {
      let tone: RenderedSection['tone']
      if (cfg.tone !== 'auto') tone = cfg.tone
      else {
        const prev = look(out[i - 1]?.tone)
        const nextFixed = list[i + 1]?.tone !== 'auto' ? look(list[i + 1]?.tone) : undefined
        tone = prev === first ? second : first
        // 与下一块撞色且换一个不会撞上一块时才换，优先保证和上一块错开
        if (tone === nextFixed) {
          const alt = tone === first ? second : first
          if (alt !== prev) tone = alt
        }
      }
      out.push({ key: cfg.key, ...headingOf(cfg), tone })
    })
    return out
  })

  /** 首屏「了解业务」按钮的落点：第一个实际渲染的板块；一个都没有时为空串，首屏不显示该按钮 */
  const primaryAnchor = computed(() => rendered.value[0]?.key ?? '')

  return { rendered, primaryAnchor }
}
