<template>
  <!-- 内容详情页：新闻/案例等有正文的条目从栏目页点进来看全文 -->
  <div class="article-page" :class="{ 'article-page--style2': theme.isStyle2 }">
    <div class="article-wrap">
      <div v-if="loading" class="space-y-4" aria-busy="true" aria-label="加载中">
        <div class="h-4 w-48 bg-surface rounded animate-pulse"></div>
        <div class="h-9 w-3/4 bg-surface rounded animate-pulse"></div>
        <div class="h-72 bg-surface rounded-lg animate-pulse mt-8"></div>
      </div>

      <article v-else-if="article">
        <!-- 当前位置：首页 / 所属栏目 / 条目标题（SRS 3.5.1 内容详情） -->
        <nav class="article-crumb" aria-label="当前位置">
          <RouterLink to="/">首页</RouterLink>
          <span aria-hidden="true">/</span>
          <RouterLink :to="article.parentPath">{{ article.parentName }}</RouterLink>
          <span aria-hidden="true">/</span>
          <span aria-current="page" class="truncate">{{ article.title }}</span>
        </nav>

        <header class="article-head">
          <p class="article-channel">{{ article.channelName }}</p>
          <h1 class="article-title">{{ article.title }}</h1>
          <div v-if="article.tag || article.date || article.author || article.source" class="article-meta">
            <span v-if="article.tag" class="article-tag">{{ article.tag }}</span>
            <time v-if="article.date" :datetime="article.date" class="tabular-nums">{{ article.date }}</time>
            <span v-if="article.author">作者：{{ article.author }}</span>
            <span v-if="article.source">来源：{{ article.source }}</span>
          </div>
        </header>

        <!-- 不传 title：标题已在上方 h1，传进去会在视频下方再渲染一遍 -->
        <VideoPlayer v-if="article.video" class="mt-10" :src="article.video" :poster="article.image" />
        <!-- 封面挂了直接不显示，正文照常阅读；占位块放在文章头图位置反而像故障 -->
        <img
          v-else-if="imgs.usable(article.image)"
          :src="article.image"
          :alt="article.title"
          width="800"
          height="450"
          fetchpriority="high"
          class="article-cover"
          @error="imgs.markBroken(article.image)"
        />

        <!-- 案例结构化区块：基础信息 → 改造前痛点；各块无数据时自动不显示 -->
        <component :is="parts.fact" v-if="facts.length" class="article-sec" :items="facts" heading="项目基础信息" />
        <component :is="parts.pain" v-if="pains.length" class="article-sec" :items="pains" heading="改造前客户痛点" />

        <!-- 正文：有结构化数据时它是「落地方案」，需要一个标题把它和前后区块衔接；纯文章不加 -->
        <section v-if="bodyHtml && hasStructured" class="article-sec">
          <component :is="parts.head" heading="落地方案" />
          <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 bodyHtml -->
          <div class="rich-html article-body article-body--flush" v-html="bodyHtml"></div>
        </section>
        <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 bodyHtml -->
        <div v-else-if="bodyHtml" class="rich-html article-body" v-html="bodyHtml"></div>
        <p v-else-if="article.desc" class="article-body">{{ article.desc }}</p>

        <!-- 案例结构化区块：量化收益 → 现场图集 → 客户评价 -->
        <component :is="parts.metric" v-if="metrics.length" class="article-sec" :items="metrics" heading="改造后量化收益" />
        <component :is="parts.gallery" v-if="gallery.length" class="article-sec" :images="gallery" heading="现场实拍与系统截图" :alt-prefix="`${article.title} 现场 `" />
        <component :is="parts.quote" v-if="quote?.text" class="article-sec" :quote="quote" heading="客户评价" />

        <!-- 案例页尾转化入口：仅结构化案例展示，普通新闻不打扰 -->
        <div v-if="hasStructured" class="article-cta">
          <p class="article-cta-text">想了解类似项目的落地方案与收益测算？</p>
          <button type="button" class="article-cta-btn" @click="openLead('consult', `案例详情-${article.title}`)">预约咨询</button>
        </div>

        <!-- 上一篇 / 下一篇：左右分列，窄屏上下排 -->
        <nav v-if="article.prev || article.next" class="article-around" aria-label="相邻内容">
          <RouterLink v-if="article.prev" :to="`/article/${article.prev.id}`" class="article-around-item">
            <span class="article-around-label">上一篇</span>
            <span class="article-around-title">{{ article.prev.title }}</span>
          </RouterLink>
          <span v-else></span>
          <RouterLink v-if="article.next" :to="`/article/${article.next.id}`" class="article-around-item article-around-item--next">
            <span class="article-around-label">下一篇</span>
            <span class="article-around-title">{{ article.next.title }}</span>
          </RouterLink>
        </nav>

        <RouterLink :to="article.parentPath" class="article-back">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          返回{{ article.parentName }}
        </RouterLink>
      </article>

      <!-- 不存在/已下线/加载失败：失败时可重试（SRS：内容详情加载失败） -->
      <div v-else class="py-16 text-center">
        <EmptyState :text="errorText">
          <div class="flex items-center justify-center gap-4 mt-6">
            <button v-if="failed" type="button" class="article-btn" @click="load(String(route.params.id ?? ''))">重新加载</button>
            <!-- 加载失败时拿不到所属栏目，从站内点进来的就退回来源栏目页（SRS：提供返回所属栏目入口） -->
            <button v-if="cameFromSite" type="button" class="article-btn" @click="router.back()">返回上一页</button>
            <RouterLink to="/" class="article-btn">返回首页</RouterLink>
          </div>
        </EmptyState>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 内容详情页：按路由 id 拉取正文，输出内容级 SEO，离开时清除覆盖
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticleDetail } from '@/api/article'
import type { ArticleDetail } from '@/api/article'
import { recordVisit } from '@/api/home'
import { API_SUCCESS_CODE } from '@/config'
import { useThemeStore } from '@/stores/theme'
import { useSiteStore } from '@/stores/site'
import { clearPageSeo, setPageSeo } from '@/composables/useSeo'
import { useArticleJsonLd } from '@/composables/useJsonLd'
import { sanitizeRichText } from '@/utils/sanitize'
import EmptyState from '@/components/sections/EmptyState.vue'
import VideoPlayer from '@/components/sections/VideoPlayer.vue'
import FactTable from '@/components/sections/FactTable.vue'
import PainPointList from '@/components/sections/PainPointList.vue'
import MetricBoard from '@/components/sections/MetricBoard.vue'
import ImageGallery from '@/components/sections/ImageGallery.vue'
import TestimonialQuote from '@/components/sections/TestimonialQuote.vue'
import SectionHeading from '@/components/sections/SectionHeading.vue'
import Style2FactTable from '@/components/sections/Style2FactTable.vue'
import Style2PainPointList from '@/components/sections/Style2PainPointList.vue'
import Style2MetricBoard from '@/components/sections/Style2MetricBoard.vue'
import Style2ImageGallery from '@/components/sections/Style2ImageGallery.vue'
import Style2TestimonialQuote from '@/components/sections/Style2TestimonialQuote.vue'
import Style2SectionHead from '@/components/sections/Style2SectionHead.vue'
import { useLeadModal } from '@/composables/useLeadModal'
import { useBrokenImages } from '@/composables/useBrokenImages'

defineOptions({ name: 'ArticlePage' })

/** 文章封面失效登记 */
const imgs = useBrokenImages()

const route = useRoute()
const router = useRouter()
/** 是否由站内页面跳来：vue-router 在 history.state.back 记录上一条站内地址，外链直达时为空 */
const cameFromSite = typeof window !== 'undefined' && !!window.history.state?.back
const theme = useThemeStore()
const siteStore = useSiteStore()

const article = ref<ArticleDetail | null>(null)
const loading = ref(true)
/** 网络或接口异常（可重试），区别于「内容不存在」 */
const failed = ref(false)
const errorText = ref('加载失败，请稍后重试')

// 富文本渲染前净化，v-html 不接未净化内容
const bodyHtml = computed(() => (article.value?.html ? sanitizeRichText(article.value.html) : ''))

const { openLead } = useLeadModal()

// 案例结构化数据，各字段缺省时为空，对应区块不渲染
const facts = computed(() => article.value?.extra?.facts ?? [])
const pains = computed(() => article.value?.extra?.pains ?? [])
const metrics = computed(() => article.value?.extra?.metrics ?? [])
const gallery = computed(() => (article.value?.extra?.gallery ?? []).filter(Boolean))
const quote = computed(() => article.value?.extra?.quote)
/** 至少有一项结构化数据，才按案例详情结构展示 */
const hasStructured = computed(() =>
  facts.value.length > 0 || pains.value.length > 0 || metrics.value.length > 0 || gallery.value.length > 0 || !!quote.value?.text,
)

// 区块组件随模板切换，props 约定两套一致
const parts = computed(() => theme.isStyle2
  ? { fact: Style2FactTable, pain: Style2PainPointList, metric: Style2MetricBoard, gallery: Style2ImageGallery, quote: Style2TestimonialQuote, head: Style2SectionHead }
  : { fact: FactTable, pain: PainPointList, metric: MetricBoard, gallery: ImageGallery, quote: TestimonialQuote, head: SectionHeading })

/**
 * 拉取内容详情
 * @param rawId 路由参数里的 id，非法值不发请求
 */
async function load(rawId: string): Promise<void> {
  loading.value = true
  failed.value = false
  article.value = null
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) {
    errorText.value = '内容不存在或已下线'
    loading.value = false
    return
  }
  try {
    const res = await getArticleDetail(id)
    if (res.code === API_SUCCESS_CODE && res.data) {
      article.value = res.data
      // 埋点归到所属顶级栏目（SRS：访问内容详情计为对所属栏目的一次访问）
      recordVisit(res.data.parentKey).catch(() => {})
    } else {
      // 后端对「草稿」与「不存在」都返回 404，前台统一按已下线表述
      errorText.value = '内容不存在或已下线'
    }
  } catch {
    failed.value = true
    errorText.value = '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 内容级 SEO：页面标题取条目标题，描述取条目简述，为空时沿用所属栏目页配置（SRS 3.5.1）
watch([article, loading], ([a, isLoading]) => {
  if (a) {
    const channelSeo = siteStore.seo[a.parentKey]
    setPageSeo({
      title: a.title ? `${a.title} - ${siteStore.site.webTitle || a.parentName}` : channelSeo?.title,
      description: a.desc || channelSeo?.description,
      keywords: a.keywords || channelSeo?.keywords,
      image: a.image,
    })
    return
  }
  // 加载中先不表态，避免慢网络下把正常内容判为不可收录
  if (isLoading) return
  // 不存在/已下线：禁止收录；加载失败只是暂时取不到，不输出 noindex
  setPageSeo({ title: errorText.value, noindex: !failed.value })
})

useArticleJsonLd(() =>
  article.value
    ? {
        title: article.value.title,
        description: article.value.desc,
        image: article.value.image,
        date: article.value.date,
        author: article.value.author,
        channelName: article.value.channelName,
        parentName: article.value.parentName,
        parentPath: article.value.parentPath,
      }
    : null,
)

// 离开详情页必须清除，否则标题与 og 残留到下一个页面
onUnmounted(() => clearPageSeo())

watch(() => route.params.id, (id) => load(String(id ?? '')), { immediate: true })
</script>

<style scoped src="./article.css"></style>
