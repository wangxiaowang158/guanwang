// 页面 SEO 输出 —— 把后台录入的标题、关键词、描述写入当前文档
// 取值优先级：栏目页 SEO 配置 > 路由自带标题 > 基本信息管理的站点级取值
// 三级都缺时保留 index.html 的既有取值，不覆盖成空串

import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useSiteStore } from '@/stores/site'

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

  // 配置均为异步到达，故连同路由一起监听，任一变化都重新输出
  watch(
    [() => route.name, () => route.meta.title, seo, site],
    ([name, metaTitle]) => {
      const channelSeo = name ? seo.value[String(name)] : undefined
      const title = channelSeo?.title || metaTitle || site.value.webTitle
      if (title) document.title = title
      setMeta('keywords', channelSeo?.keywords || site.value.keywords || '')
      setMeta('description', channelSeo?.description || site.value.description || '')
    },
    { immediate: true }
  )
}
