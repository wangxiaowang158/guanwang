<template>
  <div class="rs-home">
    <!-- 首屏 Hero：满屏深色大图叠加，编辑式大标题；可配背景图/视频 -->
    <section class="rs-hero">
      <!-- 背景媒体层：视频优先，其次图片，垫在深色渐变之上、蒙版之下 -->
      <video v-if="showHeroVideo" ref="heroVideoRef" class="rs-hero-media" :src="heroVideo" :poster="heroImage || undefined" autoplay muted loop playsinline @error="markHeroVideoFailed"></video>
      <img v-else-if="heroImage" :src="heroImage" alt="" class="rs-hero-media" width="1920" height="1080" fetchpriority="high" />
      <HeroVideoToggle :video="heroVideoRef" class="home-hero-toggle" />
      <div class="rs-hero-overlay"></div>
      <!-- 文案区占满剩余高度并垂直居中，数据条随文档流排在其后，移动端不会互相覆盖 -->
      <div class="rs-hero-main">
        <div class="relative z-10 mx-auto px-6 lg:px-10 w-full" style="max-width: var(--rs-content-max)">
          <div class="max-w-3xl">
            <div class="rs-hero-tag">{{ heroTag }}</div>
            <h1 class="rs-hero-title"><span v-for="(part, i) in heroTitleParts" :key="i" class="rs-hero-title-part">{{ part }}</span></h1>
            <p v-if="heroDesc" class="rs-hero-desc">{{ heroDesc }}</p>
            <div class="flex flex-wrap gap-4 mt-9">
              <button type="button" class="rs-btn-primary" @click="openLead('energyAssess', '首页首屏')">{{ heroPrimaryText }}</button>
              <button v-if="primaryAnchor" type="button" class="rs-btn-ghost" @click="scrollToAnchor(primaryAnchor)">{{ heroSecondaryText }}</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="sections?.achievements.length" class="rs-hero-stats">
        <div class="mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-px" style="max-width: var(--rs-content-max)">
          <div v-for="a in sections.achievements.slice(0, 4)" :key="a.id" class="rs-hero-stat-item">
            <AchievementStat :value="a.value" :suffix="a.suffix" :label="a.label" accent="#fff" on-dark />
          </div>
        </div>
        <p v-if="statsNote" class="rs-hero-stats-note mx-auto px-6 lg:px-10" style="max-width: var(--rs-content-max)">{{ statsNote }}</p>
      </div>
    </section>

    <!-- 首屏之后的板块：顺序、显隐、标题、底色由后台「基本信息 → 首页布局」配置；缺数据的板块整块不渲染 -->
    <HomeSectionList :sections="rendered" :data="sections" :site="site" :briefs="briefs" :news="news" :cases="cases" style2 />
  </div>
</template>
<!-- STYLE2_HOME_SCRIPT -->
<script setup lang="ts">
// 样式二首页（浅色）：复用首页聚合数据，仅首屏呈现层不同
import { ref, computed, onMounted } from 'vue'
import { getHomeSections, recordVisit } from '@/api/home'
import type { HomeSections } from '@/api/home'
import { useSiteStore } from '@/stores/site'
import { API_SUCCESS_CODE } from '@/config'
import { useBrand } from '@/composables/useBrand'
import { useHeroVideo } from '@/composables/useHeroVideo'
import HeroVideoToggle from '@/components/common/HeroVideoToggle.vue'
import { scrollToAnchor } from '@/composables/useWindowScroll'
import AchievementStat from './components/AchievementStat.vue'
import HomeSectionList from './components/HomeSectionList.vue'
import { useBusinessBriefs, useHomeCases, useHomeNews } from '@/composables/useHomeShowcase'
import { useLeadModal } from '@/composables/useLeadModal'
import { useHomeLayout } from '@/composables/useHomeLayout'
import { useHomeCopy } from '@/composables/useHomeCopy'
import { HOME_DEFAULT_IMAGES } from '@/config/defaultImages'

const sections = ref<HomeSections | null>(null)
const siteStore = useSiteStore()
// 站点信息取自 site store，与页眉/页脚共享同一次请求
const site = computed(() => siteStore.site)
// 首屏按钮文案：后台配了用后台，否则内置文案
const { heroPrimaryText, heroSecondaryText } = useHomeCopy(sections, site)
// 取自其他页面的板块：三大业务（业务页解决方案区块）、新闻资讯（新闻页）
const { briefs } = useBusinessBriefs()
const { news } = useHomeNews()
const { cases } = useHomeCases()
// 首屏主按钮直接唤起预约弹窗（预选节能测算），不用先滚到页底找表单
const { openLead } = useLeadModal()
// 板块顺序与显隐按后台首页布局；首屏主按钮跳到第一个实际渲染的板块
const { rendered, primaryAnchor } = useHomeLayout(sections, site, briefs, news, cases)

// 首屏文案取自基本信息管理，未配置时用内置文案
const heroTitle = computed(() => site.value.slogan || '让建筑更节能　让环境更舒适')
// 标语按空格（含全角）拆成短语，每段整体换行，避免在短语中间断开
const heroTitleParts = computed(() => heroTitle.value.split(/[\s　]+/).filter(Boolean))
const { companyEn } = useBrand()
const heroTag = computed(() => `${companyEn.value} · ${site.value.subSlogan || '智慧能源'}`)
const heroDesc = computed(() => site.value.description || '')
const statsNote = computed(() => site.value.heroStatsNote?.trim() || '')

// Hero 背景媒体：视频优先，其次背景图（站点配置优先，回退板块背景配置 backgrounds.hero）
const heroImage = computed(() => site.value.heroImage || sections.value?.backgrounds?.hero || HOME_DEFAULT_IMAGES.hero)
const heroVideo = computed(() => site.value.heroVideo || '')
// 窄屏与减少动效偏好下不播背景视频，回落到背景图
const { blocked: heroVideoBlocked, markFailed: markHeroVideoFailed } = useHeroVideo()
const showHeroVideo = computed(() => !!heroVideo.value && !heroVideoBlocked.value)
const heroVideoRef = ref<HTMLVideoElement | null>(null)

onMounted(async () => {
  recordVisit('home').catch(() => {})
  try {
    const secRes = await getHomeSections()
    if (secRes.code === API_SUCCESS_CODE && secRes.data) sections.value = secRes.data
  } catch {
    sections.value = null
  }
})
</script>
<!-- STYLE2_HOME_STYLE -->
<style scoped>
/* Hero */
/* 首屏背景视频暂停按钮：底部是业绩数据条，挪到右上角导航下方 */
.rs-hero .home-hero-toggle { top: 96px; bottom: auto; }
.rs-hero {
  position: relative;
  min-height: min(100svh, 880px);
  display: flex;
  flex-direction: column;
  /* 首屏背景是任意照片，白字必须压在深色遮罩上，故浅色站首屏也保持深色 */
  background: #000;
  overflow: hidden;
}
.rs-hero-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
.rs-hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  /* 中性黑遮罩：上浅下深，标题区可读、照片本身仍是主角 */
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.25) 65%);
  pointer-events: none;
}
.rs-hero-tag {
  display: inline-block;
  font-size: var(--text-fs-body-lg);
  font-weight: 600;
  color: var(--rs-text-light-sub);
  margin-bottom: 16px;
}
/* 中文标题不用合成加粗与负字距，理由同样式一 */
.rs-hero-title {
  font-size: var(--rs-text-hero);
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  letter-spacing: 0;
}
.rs-hero-title-part {
  display: inline-block;
}
.rs-hero-title-part:not(:last-child) {
  margin-right: 0.5em;
}
/* STYLE2_HERO_CSS2 */
.rs-hero-desc {
  margin-top: 24px;
  font-size: var(--text-fs-body-lg);
  line-height: 1.7;
  color: var(--rs-text-light-sub);
  max-width: 36rem;
}
.rs-hero-main {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  align-items: center;
  /* 顶栏 76px 叠在首屏上，文案整体下移避开 */
  padding: 128px 0 64px;
}
/* 数据条不做毛玻璃（全站毛玻璃只留给顶栏），只用一条细分隔线与首屏分开 */
.rs-hero-stats {
  position: relative;
  z-index: 10;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
}
.rs-hero-stats-note { margin: 0 auto; padding-bottom: 14px; font-size: 12px; text-align: right; color: rgba(255, 255, 255, 0.55); }
.rs-hero-stat-item {
  padding: 26px 16px;
  text-align: center;
}
/* STYLE2_BTN_CSS */
/* 首屏按钮：胶囊形；主按钮按钮蓝，次按钮白描边（首屏恒为深色） */
.rs-btn-primary,
.rs-btn-ghost {
  min-height: 48px;
  padding: 0 28px;
  font-size: 17px;
  font-weight: 500;
  border-radius: var(--radius-pill);
  transition: background-color var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast);
}
.rs-btn-primary {
  background: var(--color-action);
  color: #fff;
}
.rs-btn-primary:hover {
  background: var(--color-action-hover);
}
.rs-btn-ghost {
  border: 1px solid rgba(255, 255, 255, 0.6);
  color: #fff;
}
.rs-btn-ghost:hover {
  background: #fff;
  color: #1d1d1f;
  border-color: #fff;
}
</style>
