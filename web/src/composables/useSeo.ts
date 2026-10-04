// 页面 SEO 输出 —— 把后台录入的标题、关键词、描述写入当前文档
// 取值优先级：页面级覆盖（详情页等运行时才知道标题的页面）> 栏目页 SEO 配置
//           > 路由自带标题 > 基本信息管理的站点级取值
// 各级都缺时保留 index.html 的既有取值，不覆盖成空串
// 同时输出 og:* 与 canonical，供社交平台抓取与搜索引擎去重

import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSiteStore } from '@/stores/site'

/** 页面级 SEO 覆盖项，由详情页这类标题运行时才确定的页面填写 */
export interface PageSeoOverride {
  title?: string
  description?: string
  /** 页面关键字，与预渲染 head 同一回落链：内容自身 → 栏目 → 站点 */
  keywords?: string
  /** 社交卡片配图，相对路径会补成绝对地址 */
  image?: string
  /**
   * 是否禁止收录
   * 内容不存在/已下线的详情页要置 true：地址仍能打开但没有实质内容，
   * 被收录后会以"空页面"出现在搜索结果里
   */
  noindex?: boolean
}

/**
 * 页面级覆盖值
 * 放模块级而非组件内：useSeo 只在根组件调一次，子页面无法直接参与那次调用，
 * 故用一个共享 ref 做单向通道
 */
const override = ref<PageSeoOverride | null>(null)

/**
 * 设置当前页面的 SEO 覆盖值
 * 页面卸载时须调 clearPageSeo，否则离开后标题会残留到下一个页面
 * @param value 覆盖项
 */
export function setPageSeo(value: PageSeoOverride): void {
  override.value = value
}

/** 清除页面级覆盖，回落到栏目/路由/站点级取值 */
export function clearPageSeo(): void {
  override.value = null
}

/**
 * 写入或更新 meta 标签内容
 * 页面首次输出时标签可能不存在（index.html 未预置该项），此时补建
 * @param name meta 的 name 属性
 * @param content 要写入的内容，空值时不做处理
 */
function setMeta(name: string, content: string): void {
  if (!content) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 写入或更新 og:* 一类按 property 标识的 meta
 * @param property og 属性名，如 og:title
 * @param content 要写入的内容，空值时不做处理
 */
function setProperty(property: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  // 空值即移除：直接跳过会让上一篇文章的 og:image 等残留到后续页面，分享卡片配错图
  if (!content) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * 写入或移除 robots 指令
 * 与 setMeta 不同，这里必须支持"移除"：robots 是少数几个
 * 留着旧值就会造成实际损失的标签——从 404 页导航到正常页面时若不清掉，
 * 那个正常页面会被当成禁止收录
 * @param noindex 为真时输出 noindex，为假时移除该标签
 */
function setRobots(noindex: boolean): void {
  const selector = 'meta[name="robots"]'
  const existing = document.head.querySelector<HTMLMetaElement>(selector)
  if (!noindex) {
    existing?.remove()
    return
  }
  const el = existing ?? document.createElement('meta')
  el.setAttribute('name', 'robots')
  // follow 而非 nofollow：页面本身不值得收录，但页内指回首页/栏目页的链接仍应被跟踪
  el.setAttribute('content', 'noindex, follow')
  if (!existing) document.head.appendChild(el)
}

/**
 * 写入或更新 canonical 链接
 * @param href 规范地址，空值时不做处理
 */
function setCanonical(href: string): void {
  if (!href) return
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * 规整后台配置的站点网址为 origin，规则与后端 site-origin.ts 的 normalizeOrigin 一致：
 * 预渲染 head 与这里输出的 canonical 必须同一个域名，否则搜索引擎看到两份口径
 * @param website 后台「网址」字段，可能缺协议、带尾斜杠
 * @returns 形如 https://example.com；未配置或不是合法网址时返回空串
 */
function siteOrigin(website?: string): string {
  const trimmed = (website || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const withProto = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withProto).origin
  } catch {
    return ''
  }
}

/**
 * 补成绝对地址
 * og:image 与 canonical 都要求绝对 URL，抓取方不会按当前页面解析相对路径。
 * 优先用后台配置的正式域名：从备用域名或 IP 访问时，canonical 仍指向正式站点
 * @param path 相对路径或已是绝对地址的 URL
 * @param website 后台配置的站点网址
 */
function toAbsolute(path: string, website?: string): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const origin = siteOrigin(website) || window.location.origin
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * 按当前路由输出页面 SEO 信息
 * 在根组件调用一次即可覆盖全站；路由切换与配置到达都会重新输出。
 * 栏目页取后台按栏目录入的配置（路由 name 即栏目标识）；
 * 会员页等非栏目页无栏目配置，取路由自带标题，搜索引擎信息回落到站点级取值，
 * 从而不会残留上一个页面的标题
 */
export function useSeo(): void {
  const route = useRoute()
  const siteStore = useSiteStore()
  const { seo, site } = storeToRefs(siteStore)

  void siteStore.fetchSeo()
  void siteStore.fetchSite()

  // 配置均为异步到达，故连同路由与页面级覆盖一起监听，任一变化都重新输出
  watch(
    [() => route.name, () => route.meta.title, () => route.fullPath, seo, site, override],
    ([name, metaTitle, fullPath]) => {
      const channelSeo = name ? seo.value[String(name)] : undefined
      const page = override.value
      const title = page?.title || channelSeo?.title || metaTitle || site.value.webTitle
      const description = page?.description || channelSeo?.description || site.value.description || ''
      if (title) document.title = title
      setMeta('keywords', page?.keywords || channelSeo?.keywords || site.value.keywords || '')
      setMeta('description', description)

      // 禁止收录：页面级覆盖（内容不存在的详情页）或路由自带标记（404 页）
      setRobots(page?.noindex === true || route.meta.noindex === true)

      // 社交卡片：og:type 按页面性质区分，详情页（有页面级覆盖）算 article，其余算网站首页/栏目页
      // 不存在的页面（noindex 覆盖）不算 article
      setProperty('og:type', page && !page.noindex ? 'article' : 'website')
      setProperty('og:site_name', site.value.webTitle || '')
      setProperty('og:title', title || '')
      setProperty('og:description', description)
      const image = page?.image ? toAbsolute(page.image, site.value.website) : ''
      setProperty('og:image', image)

      // canonical 取当前路径但剔掉查询串与哈希：
      // 同一篇内容从不同渠道进来常带 utm 参数，不剔的话搜索引擎会当成多个地址
      const canonical = toAbsolute(String(fullPath).split(/[?#]/)[0] || '/', site.value.website)
      setProperty('og:url', canonical)
      setCanonical(canonical)
    },
    { immediate: true }
  )
}
