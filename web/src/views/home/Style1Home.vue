<template>
  <div class="s1-home">
    <!-- 首屏：背景图/视频 + 深色遮罩，标语与两个行动入口，底部业绩数据条 -->
    <section class="s1-hero">
      <video v-if="showHeroVideo" ref="heroVideoRef" class="s1-hero-media" :src="heroVideo" :poster="heroImage || undefined" autoplay muted loop playsinline @error="markHeroVideoFailed" />
      <img v-else-if="heroImage" :src="heroImage" alt="" class="s1-hero-media" width="1920" height="1080" fetchpriority="high" />
      <HeroVideoToggle :video="heroVideoRef" class="home-hero-toggle" />
      <div class="s1-hero-overlay" aria-hidden="true"></div>

      <div class="s1-hero-inner">
        <div class="s1-hero-content">
          <p class="s1-hero-tag"><span class="s1-tag-dot" aria-hidden="true"></span>{{ heroTag }}</p>
          <h1 class="s1-hero-title"><span v-for="(part, i) in heroTitleParts" :key="i" class="s1-hero-title-part">{{ part }}</span></h1>
          <p v-if="heroDesc" class="s1-hero-desc">{{ heroDesc }}</p>
          <div class="s1-hero-actions">
            <button type="button" class="s1-btn-primary" @click="openLead('energyAssess', '首页首屏')">{{ heroPrimaryText }}</button>
            <button v-if="primaryAnchor" type="button" class="s1-btn-outline" @click="scrollToAnchor(primaryAnchor)">{{ heroSecondaryText }}</button>
          </div>
        </div>
      </div>

      <div v-if="sections?.achievements.length" class="s1-stats-bar">
        <div class="s1-container s1-stats-grid">
          <HeroStat v-for="a in sections.achievements.slice(0, 4)" :key="a.id" :value="a.value" :suffix="a.suffix" :label="a.label" />
        </div>
        <!-- 数据口径：统计时间与来源，后台基本信息里填，留空不显示 -->
        <p v-if="statsNote" class="s1-container s1-stats-note">{{ statsNote }}</p>
      </div>
    </section>

    <!-- 首屏之后的板块：顺序、显隐、标题、底色由后台「基本信息 → 首页布局」配置；缺数据的板块整块不渲染 -->
    <SkeletonRows v-if="loading && !rendered.length" :rows="3" tall class="s1-container py-16" />
    <HomeSectionList :sections="rendered" :data="sections" :site="site" :briefs="briefs" :news="news" :cases="cases" />
  </div>
</template>

<script setup lang="ts">
// 首页样式一（深蓝科技风）：按框架图第三版，首屏 + 6 个板块，数据来自后台内容管理与基本信息管理
import { ref, computed, onMounted } from 'vue'
import { getHomeSections, recordVisit } from '@/api/home'
import type { HomeSections } from '@/api/home'
import { useSiteStore } from '@/stores/site'
import { API_SUCCESS_CODE } from '@/config'
import { useHeroVideo } from '@/composables/useHeroVideo'
import HeroVideoToggle from '@/components/common/HeroVideoToggle.vue'
import { scrollToAnchor } from '@/composables/useWindowScroll'
import SkeletonRows from '@/components/common/SkeletonRows.vue'
import HeroStat from './components/HeroStat.vue'
import HomeSectionList from './components/HomeSectionList.vue'
import { useBusinessBriefs, useHomeCases, useHomeNews } from '@/composables/useHomeShowcase'
import { useLeadModal } from '@/composables/useLeadModal'
import { useHomeLayout } from '@/composables/useHomeLayout'
import { useHomeCopy } from '@/composables/useHomeCopy'
import { HOME_DEFAULT_IMAGES } from '@/config/defaultImages'

const sections = ref<HomeSections | null>(null)
const loading = ref(true)
const siteStore = useSiteStore()
// 站点信息取自 site store，与页眉/页脚共享同一次请求
const site = computed(() => siteStore.site)
// 取自其他页面的板块：三大业务（业务页解决方案区块）、新闻资讯（新闻页）
const { briefs } = useBusinessBriefs()
const { news } = useHomeNews()
const { cases } = useHomeCases()
// 首屏主按钮直接唤起预约弹窗（预选节能测算），不用先滚到页底找表单
const { openLead } = useLeadModal()
// 首屏按钮文案：后台配了用后台，否则内置文案
const { heroPrimaryText, heroSecondaryText } = useHomeCopy(sections, site)
// 板块顺序与显隐按后台首页布局；首屏主按钮跳到第一个实际渲染的板块
const { rendered, primaryAnchor } = useHomeLayout(sections, site, briefs, news, cases)

// 首屏文案：主标语、副标语取自基本信息管理，描述取站点描述；未配置时用内置文案
const heroTitle = computed(() => site.value.slogan || '让建筑更节能　让环境更舒适')
// 按空白（含全角空格）拆分短语，窄屏只在短语之间换行
const heroTitleParts = computed(() => heroTitle.value.split(/[\s\u3000]+/).filter(Boolean))
const heroTag = computed(() => site.value.subSlogan || '您身边专业的智慧能源提供商')
const heroDesc = computed(() => site.value.description || '')
const statsNote = computed(() => site.value.heroStatsNote?.trim() || '')

// 首屏背景媒体：窄屏与减少动效偏好下不播背景视频，回落到背景图
const heroImage = computed(() => site.value.heroImage || sections.value?.backgrounds?.hero || HOME_DEFAULT_IMAGES.hero)
const heroVideo = computed(() => site.value.heroVideo || '')
const { blocked: heroVideoBlocked, markFailed: markHeroVideoFailed } = useHeroVideo()
const showHeroVideo = computed(() => !!heroVideo.value && !heroVideoBlocked.value)
const heroVideoRef = ref<HTMLVideoElement | null>(null)

onMounted(async () => {
  recordVisit('home').catch(() => {})
  try {
    const res = await getHomeSections()
    if (res.code === API_SUCCESS_CODE && res.data) sections.value = res.data
  } catch {
    sections.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped src="./style1-home.css"></style>
