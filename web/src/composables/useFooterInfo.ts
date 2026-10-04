// 页脚公共数据 —— 样式一 AppFooter 与样式二 Style2Footer 共用
// 两套页脚的取值口径（版权兜底、二维码显隐、栏目分组）必须一致，收在这里避免各写一份
import { computed, onMounted } from 'vue'
import type { MenuNode } from '@/api/menu'
import { useSiteStore } from '@/stores/site'
import { defaultCopyright } from '@/config/brand'
import { sanitizeRichText } from '@/utils/sanitize'

/** 页脚按栏目分栏展示的列数上限，其余一级栏目只在「更多」列里出现名称 */
const FOOTER_GROUP_MAX = 4

export function useFooterInfo() {
  const siteStore = useSiteStore()
  const site = computed(() => siteStore.site)
  const menu = computed<MenuNode[]>(() => siteStore.menu)

  // 二维码与 Logo：未配置时为空串，模板据此整块不渲染（不再显示写着「微信二维码」的空框）
  const wechatQr = computed(() => site.value.wechatQr || '')
  const footerLogo = computed(() => site.value.footerLogo || '')

  /**
   * 版权声明
   * 后台版权信息支持格式化内容（可含链接），故按富文本净化后渲染；
   * 未填写时用系统内置文案（含当前年份与公司全称）
   */
  const copyrightHtml = computed(() => {
    const raw = (site.value.copyright || '').trim()
    return raw ? sanitizeRichText(raw.replace(/\n/g, '<br>')) : ''
  })
  const copyrightFallback = defaultCopyright()

  /** 有子栏目的一级栏目，按栏目分栏展示其子菜单 */
  const groups = computed(() => menu.value.filter(m => m.children?.length).slice(0, FOOTER_GROUP_MAX))
  /** 其余一级栏目：归入「更多」列 */
  const others = computed(() => {
    const grouped = new Set(groups.value.map(g => g.key))
    return menu.value.filter(m => !grouped.has(m.key))
  })

  /** 子菜单项跳转地址：同页锚点用 hash */
  const childTo = (child: MenuNode) => (child.anchor ? `${child.path}#${child.anchor}` : child.path)

  onMounted(() => {
    // store 内部已做去重，重复调用不会产生额外请求
    siteStore.fetchSite()
    siteStore.fetchMenu()
  })

  return { site, wechatQr, footerLogo, copyrightHtml, copyrightFallback, groups, others, childTo }
}
