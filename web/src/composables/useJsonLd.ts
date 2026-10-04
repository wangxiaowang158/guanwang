// 结构化数据输出 —— 向 <head> 注入 JSON-LD，供搜索引擎生成企业信息卡与富摘要
// 站点级（Organization + WebSite）在根组件注入一次，随站点配置到达后更新；
// 页面级（Article + BreadcrumbList）由详情页按内容注入，离开页面时必须清除，
// 否则上一篇文章的结构化数据会残留到下一个页面，被判为「内容与标记不符」
//
// 与 useSeo 分开而不合并：meta 标签是逐个属性增量更新，
// JSON-LD 是整块脚本替换，两者的写入语义不同，合在一起会互相牵制

import { onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSiteStore } from '@/stores/site'

/** 标记本模块写入的脚本节点，避免误删第三方统计代码插入的同类标签 */
const LD_ATTR = 'data-ld'

/**
 * 写入或移除一块 JSON-LD 脚本
 * @param id 该块的标识，同一 id 重复写入即替换
 * @param data 结构化数据对象，传 null 表示移除该块
 */
function setJsonLd(id: string, data: Record<string, unknown> | null): void {
  const selector = `script[${LD_ATTR}="${id}"]`
  const existing = document.head.querySelector<HTMLScriptElement>(selector)
  if (!data) {
    existing?.remove()
    return
  }
  const el = existing ?? document.createElement('script')
  el.type = 'application/ld+json'
  el.setAttribute(LD_ATTR, id)
  // textContent 而非 innerHTML：JSON 里的 < > & 不该被当成 HTML 解析
  el.textContent = JSON.stringify(data)
  if (!existing) document.head.appendChild(el)
}

/** 补成绝对地址，结构化数据里的 url/logo 均要求绝对 URL */
function toAbsolute(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

/** 剔除值为空的字段：schema.org 里空字符串属性不如不写，写了会被判为无效值 */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null))
}

/**
 * 注入站点级结构化数据（Organization + WebSite）
 * 在根组件调用一次即覆盖全站；站点配置异步到达，故用 watch 而非取一次值。
 * 能源行业的采购方常先搜公司名核实资质，Organization 决定搜索结果里
 * 能否出现带 Logo、电话、地址的企业信息卡
 */
export function useSiteJsonLd(): void {
  const siteStore = useSiteStore()
  const { site } = storeToRefs(siteStore)

  void siteStore.fetchSite()

  watch(
    site,
    (s) => {
      // 站点名缺失时整块不输出：Organization 的 name 是必需属性，
      // 缺它的标记会被判为无效，不如不给
      const name = s.webTitle || ''
      if (!name) {
        setJsonLd('organization', null)
        setJsonLd('website', null)
        return
      }

      // 官网地址优先用后台配置的域名，未配时退到当前访问地址
      const origin = s.website ? toAbsolute(s.website) : window.location.origin

      const contactPoint = s.phone
        ? compact({
            '@type': 'ContactPoint',
            telephone: s.phone,
            contactType: 'customer service',
            areaServed: 'CN',
            availableLanguage: 'zh-CN',
            email: s.contactEmail || '',
          })
        : null

      setJsonLd(
        'organization',
        compact({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name,
          url: origin,
          logo: s.logo ? toAbsolute(s.logo) : '',
          description: s.description || '',
          slogan: s.slogan || '',
          telephone: s.phone || '',
          email: s.contactEmail || '',
          address: s.address
            ? { '@type': 'PostalAddress', streetAddress: s.address, addressCountry: 'CN' }
            : '',
          contactPoint: contactPoint ?? '',
        }),
      )

      setJsonLd(
        'website',
        compact({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name,
          url: origin,
          description: s.description || '',
          inLanguage: 'zh-CN',
        }),
      )
    },
    { immediate: true, deep: true },
  )
}

/** 文章级结构化数据的入参，由详情页按当前内容提供 */
export interface ArticleJsonLdInput {
  title: string
  description?: string
  image?: string
  /** 发布日期，取内容的更新时间；格式不限，能被 Date 解析即可 */
  date?: string
  author?: string
  /** 所属栏目名与路径，用于面包屑标记 */
  channelName?: string
  parentName?: string
  parentPath?: string
}

/**
 * 注入文章级结构化数据（Article + BreadcrumbList）
 * 供详情页调用，组件卸载时自动清除，无需调用方手动收尾
 * @param input 响应式取值函数，内容异步到达故传函数而非值；返回 null 时清除标记
 */
export function useArticleJsonLd(input: () => ArticleJsonLdInput | null): void {
  const siteStore = useSiteStore()
  const { site } = storeToRefs(siteStore)

  watch(
    [input, site],
    ([data, s]) => {
      if (!data?.title) {
        setJsonLd('article', null)
        setJsonLd('breadcrumb', null)
        return
      }

      const siteName = s.webTitle || ''
      // 日期非法时不输出该字段：Article 的 datePublished 要求 ISO 8601，
      // 原样塞入后台可能录成的「2025年3月」会让整块标记失效
      const parsed = data.date ? new Date(data.date) : null
      const published = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : ''

      setJsonLd(
        'article',
        compact({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: data.title,
          description: data.description || '',
          image: data.image ? toAbsolute(data.image) : '',
          datePublished: published,
          dateModified: published,
          inLanguage: 'zh-CN',
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': toAbsolute(window.location.pathname),
          },
          author: data.author
            ? { '@type': 'Person', name: data.author }
            : siteName
              ? { '@type': 'Organization', name: siteName }
              : '',
          publisher: siteName
            ? compact({
                '@type': 'Organization',
                name: siteName,
                logo: s.logo ? { '@type': 'ImageObject', url: toAbsolute(s.logo) } : '',
              })
            : '',
        }),
      )

      // 面包屑标记：层级与详情页可见的面包屑一致，标记与页面内容不符会被判为作弊
      const crumbs: Array<{ name: string; item?: string }> = [{ name: '首页', item: toAbsolute('/') }]
      if (data.parentName && data.parentPath) {
        crumbs.push({ name: data.parentName, item: toAbsolute(data.parentPath) })
      }
      if (data.channelName) crumbs.push({ name: data.channelName })
      crumbs.push({ name: data.title })

      setJsonLd('breadcrumb', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) =>
          compact({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            // 末级不给 item：当前页自身不作为可跳转项
            item: c.item ?? '',
          }),
        ),
      })
    },
    { immediate: true, deep: true },
  )

  onUnmounted(() => {
    setJsonLd('article', null)
    setJsonLd('breadcrumb', null)
  })
}
