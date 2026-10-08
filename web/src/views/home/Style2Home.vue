<template>
  <div class="rs-home">
    <!-- 首屏 Hero：满屏深色大图叠加，编辑式大标题；可配背景图/视频 -->
    <section class="rs-hero">
      <!-- 背景媒体层：视频优先，其次图片，垫在深色渐变之上、蒙版之下 -->
      <video v-if="showHeroVideo" class="rs-hero-media" :src="heroVideo" :poster="heroImage || undefined" autoplay muted loop playsinline @error="markHeroVideoFailed"></video>
      <img v-else-if="heroImage" :src="heroImage" alt="" class="rs-hero-media" width="1920" height="1080" fetchpriority="high" />
      <div class="rs-hero-overlay"></div>
      <!-- 文案区占满剩余高度并垂直居中，数据条随文档流排在其后，移动端不会互相覆盖 -->
      <div class="rs-hero-main">
        <div class="relative z-10 mx-auto px-6 lg:px-10 w-full" style="max-width: var(--rs-content-max)">
          <div class="max-w-3xl">
            <div class="rs-hero-tag">{{ heroTag }}</div>
            <h1 class="rs-hero-title">{{ heroTitle }}</h1>
            <p v-if="heroDesc" class="rs-hero-desc">{{ heroDesc }}</p>
            <div class="flex flex-wrap gap-4 mt-9">
              <button type="button" class="rs-btn-primary" @click="scrollToAnchor('business')">{{ heroPrimaryText }}</button>
              <button type="button" class="rs-btn-ghost" @click="scrollToAnchor('contact')">{{ heroSecondaryText }}</button>
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
      </div>
    </section>

    <!-- 公司简介：编辑式左右分栏 -->
    <section id="about" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div class="lg:col-span-4">
          <p class="rs-eyebrow">{{ heading('about').eyebrow }}</p>
          <h2 class="rs-h2">{{ sections?.about.title || heading('about').eyebrow }}</h2>
          <div class="rs-accent-bar"></div>
        </div>
        <div class="lg:col-span-8">
          <p v-if="sections?.about.subtitle" class="text-base font-medium mb-4" style="color: var(--rs-primary)">{{ sections.about.subtitle }}</p>
          <p class="text-base leading-loose whitespace-pre-line" style="color: var(--rs-text-body)">{{ sections?.about.content }}</p>
        </div>
      </div>
    </section>
    <!-- 业务与行业：深色底，序号编号陈列 -->
    <section id="business" class="rs-section scroll-mt-20" style="background: var(--rs-bg-cream)">
      <div class="rs-container">
        <p class="rs-eyebrow">{{ heading('business').eyebrow }}</p>
        <h2 class="rs-h2 mb-12">{{ heading('business').title }}</h2>
        <EmptyState v-if="!sections?.business.length" v-show="!loading" />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px" style="background: var(--rs-border)">
          <article
            v-for="(item, i) in sections.business"
            :key="item.id"
            class="rs-biz-card"
          >
            <!-- 后台选了图标显示图标，未选（或图标已下架）回落为序号 -->
            <component :is="homeIconOf(item.icon)" v-if="homeIconOf(item.icon)" class="rs-card-icon" aria-hidden="true" />
            <span v-else class="rs-biz-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="text-lg font-bold mb-3 mt-6" style="color: var(--rs-text-dark)">{{ item.title }}</h3>
            <p class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ item.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 主要产品：编辑式横向条目 -->
    <section id="product" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container">
        <p class="rs-eyebrow">{{ heading('product').eyebrow }}</p>
        <h2 class="rs-h2 mb-12">{{ heading('product').title }}</h2>
        <EmptyState v-if="!sections?.products.length" v-show="!loading" />
        <div v-else class="divide-y" style="border-color: var(--rs-border)">
          <article v-for="item in sections.products" :key="item.id" class="grid grid-cols-1 lg:grid-cols-12 gap-8 py-9 first:pt-0 items-center">
            <div class="lg:col-span-4 aspect-[16/10] overflow-hidden" style="background: var(--rs-bg-cream)">
              <SafeImage :src="item.image" :fallback="HOME_DEFAULT_IMAGES.product" :alt="item.name" :width="480" :height="300" />
            </div>
            <div class="lg:col-span-3">
              <h3 class="text-xl font-bold mb-3" style="color: var(--rs-text-dark)">{{ item.name }}</h3>
              <p class="text-sm leading-relaxed" style="color: var(--rs-text-body)">{{ item.summary }}</p>
            </div>
            <ul class="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 self-center">
              <li v-for="f in item.features" :key="f" class="flex items-start gap-2.5 text-sm" style="color: var(--rs-text-body)">
                <span class="mt-1.5 w-1.5 h-1.5 shrink-0" style="background: var(--rs-primary)"></span>
                {{ f }}
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- 技术支持及服务：浅底卡片 -->
    <section id="service" class="rs-section scroll-mt-20" style="background: var(--rs-bg-cream)">
      <div class="rs-container">
        <p class="rs-eyebrow">{{ heading('service').eyebrow }}</p>
        <h2 class="rs-h2 mb-12">{{ heading('service').title }}</h2>
        <EmptyState v-if="!sections?.services.length" v-show="!loading" />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <article v-for="item in sections.services" :key="item.id" class="bg-white p-7 border-t-2" style="border-color: var(--rs-primary)">
            <!-- 后台选了图标才显示；服务卡片原本无序号，未选时保持原样 -->
            <component :is="homeIconOf(item.icon)" v-if="homeIconOf(item.icon)" class="rs-card-icon mb-4" aria-hidden="true" />
            <h3 class="text-base font-bold mb-3" style="color: var(--rs-text-dark)">{{ item.title }}</h3>
            <p class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ item.desc }}</p>
          </article>
        </div>
      </div>
    </section>
    <!-- 经营理念：深色满幅大字 -->
    <section id="philosophy" class="rs-section scroll-mt-20" style="background: var(--rs-bg-dark)">
      <div class="rs-container text-center">
        <!-- 内层再收窄：.rs-container 的 max-width 是 scoped 样式，优先级高于工具类，写在同一元素上不生效 -->
        <div class="max-w-3xl mx-auto">
          <div class="rs-accent-bar mx-auto"></div>
          <h2 class="text-3xl md:text-4xl font-bold text-white mt-6 mb-6 leading-snug">{{ sections?.philosophy.title || site.slogan || heading('philosophy').eyebrow }}</h2>
          <p class="text-base leading-loose whitespace-pre-line" style="color: var(--rs-text-light-sub)">{{ sections?.philosophy.content }}</p>
        </div>
      </div>
    </section>

    <!-- 合作伙伴 -->
    <section id="partner" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container">
        <p class="rs-eyebrow">{{ heading('partner').eyebrow }}</p>
        <h2 class="rs-h2 mb-12">{{ heading('partner').title }}</h2>
        <EmptyState v-if="!sections?.partners.length" v-show="!loading" />
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px" style="background: var(--rs-border)">
          <component
            :is="safeExternalUrl(p.link) ? 'a' : 'div'"
            v-for="p in sections.partners"
            :key="p.id"
            :href="safeExternalUrl(p.link) || undefined"
            :target="safeExternalUrl(p.link) ? '_blank' : undefined"
            :rel="safeExternalUrl(p.link) ? 'noopener noreferrer' : undefined"
            class="rs-partner-cell"
          >
            <!-- Logo 挂了回退为名称，不显示破图（SRS 图片加载失败） -->
            <img v-if="imgs.usable(p.logo)" :src="p.logo" :alt="p.name" class="rs-partner-logo" width="140" height="48" loading="lazy" @error="imgs.markBroken(p.logo)" />
            <span v-else>{{ p.name }}</span>
          </component>
        </div>
      </div>
    </section>

    <!-- 公司业绩（数字滚动动效） -->
    <section id="achievement" class="rs-section scroll-mt-20" style="background: var(--rs-bg-cream)">
      <div class="rs-container">
        <EmptyState v-if="!sections?.achievements.length" v-show="!loading" />
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div v-for="a in sections.achievements" :key="a.id" class="text-center">
            <AchievementStat :value="a.value" :suffix="a.suffix" :label="a.label" accent="var(--rs-primary)" />
          </div>
        </div>
      </div>
    </section>

    <!-- 我眼中的中瑞恒：媒体报道与行业评价；无内容时整块不显示 -->
    <section v-if="sections?.views?.length" id="view" class="rs-section scroll-mt-20" style="background: var(--rs-bg-cream)">
      <div class="rs-container">
        <p class="rs-eyebrow">{{ heading('view').eyebrow }}</p>
        <h2 class="rs-h2 mb-12">{{ heading('view').title }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <component
            :is="v.link ? 'a' : 'article'"
            v-for="v in sections.views"
            :key="v.id"
            :href="v.link || undefined"
            :target="v.link ? '_blank' : undefined"
            :rel="v.link ? 'noopener noreferrer' : undefined"
            class="group block bg-white border-t-2"
            style="border-color: var(--rs-primary)"
          >
            <div class="aspect-video overflow-hidden rs-zoom" style="background: var(--rs-bg-cream)">
              <SafeImage :src="v.image" :fallback="HOME_DEFAULT_IMAGES.view" :alt="v.title" :width="400" :height="225" />
            </div>
            <div class="p-7">
              <h3 class="text-base font-bold mb-2" style="color: var(--rs-text-dark)">{{ v.title }}</h3>
              <p v-if="v.desc" class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ v.desc }}</p>
            </div>
          </component>
        </div>
      </div>
    </section>

    <!-- 社会贡献 -->
    <section id="social" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container">
        <p class="rs-eyebrow">{{ heading('social').eyebrow }}</p>
        <h2 class="rs-h2 mb-12">{{ heading('social').title }}</h2>
        <EmptyState v-if="!sections?.social.length" v-show="!loading" />
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article v-for="s in sections.social" :key="s.id" class="group">
            <div class="h-52 overflow-hidden mb-5 rs-zoom" style="background: var(--rs-bg-cream)">
              <SafeImage :src="s.image" :fallback="HOME_DEFAULT_IMAGES.social" :alt="s.title" :width="400" :height="208" />
            </div>
            <h3 class="text-base font-bold mb-2" style="color: var(--rs-text-dark)">{{ s.title }}</h3>
            <p class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ s.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 联系我们 -->
    <section id="contact" class="rs-section scroll-mt-20" style="background: var(--rs-bg-cream)">
      <div class="rs-container">
        <p class="rs-eyebrow">{{ contactHeading.eyebrow }}</p>
        <h2 class="rs-h2 mb-12">{{ contactHeading.title }}</h2>
        <ContactSection :site="site" />
      </div>
    </section>
  </div>
</template>
<!-- STYLE2_HOME_SCRIPT -->
<script setup lang="ts">
// 样式二首页（集团品牌风）：复用首页聚合数据，仅呈现层不同
import { ref, computed, onMounted } from 'vue'
import { getHomeSections, recordVisit } from '@/api/home'
import type { HomeSections } from '@/api/home'
import { useSiteStore } from '@/stores/site'
import { API_SUCCESS_CODE } from '@/config'
import { COMPANY_EN } from '@/config/brand'
import { useHeroVideo } from '@/composables/useHeroVideo'
import { scrollToAnchor } from '@/composables/useWindowScroll'
import { safeExternalUrl } from '@/utils/sanitize'
import EmptyState from '@/components/sections/EmptyState.vue'
import SafeImage from '@/components/common/SafeImage.vue'
import AchievementStat from './components/AchievementStat.vue'
import ContactSection from './components/ContactSection.vue'
import { useBrokenImages } from '@/composables/useBrokenImages'
import { useHomeCopy } from '@/composables/useHomeCopy'
import { homeIconOf } from '@/config/homeIcons'
import { HOME_DEFAULT_IMAGES } from '@/config/defaultImages'

/** 合作伙伴 Logo、「我眼中的中瑞恒」配图失效登记 */
const imgs = useBrokenImages()

const sections = ref<HomeSections | null>(null)
// 加载完成前不出「暂无内容」，避免每个板块先闪一下空状态
const loading = ref(true)
const siteStore = useSiteStore()
// 站点信息取自 site store，与页眉/页脚共享同一次请求
const site = computed(() => siteStore.site)
// 板块标题、首屏按钮、联系板块标题：后台配了用后台，否则内置文案
const { heading, contactHeading, heroPrimaryText, heroSecondaryText } = useHomeCopy(sections, site)

// 首屏文案取自基本信息管理，未配置时用内置文案
const heroTitle = computed(() => site.value.slogan || '让建筑更节能　让环境更舒适')
const heroTag = computed(() => `${COMPANY_EN} · ${site.value.subSlogan || '智慧能源'}`)
const heroDesc = computed(() => site.value.description || '')

// Hero 背景媒体：视频优先，其次背景图（站点配置优先，回退板块背景配置 backgrounds.hero）
const heroImage = computed(() => site.value.heroImage || sections.value?.backgrounds?.hero || HOME_DEFAULT_IMAGES.hero)
const heroVideo = computed(() => site.value.heroVideo || '')
// 窄屏与减少动效偏好下不播背景视频，回落到背景图
const { blocked: heroVideoBlocked, markFailed: markHeroVideoFailed } = useHeroVideo()
const showHeroVideo = computed(() => !!heroVideo.value && !heroVideoBlocked.value)

onMounted(async () => {
  recordVisit('home').catch(() => {})
  try {
    const secRes = await getHomeSections()
    if (secRes.code === API_SUCCESS_CODE && secRes.data) sections.value = secRes.data
  } catch {
    sections.value = null
  } finally {
    loading.value = false
  }
})
</script>
<!-- STYLE2_HOME_STYLE -->
<style scoped>
.rs-section {
  padding-top: var(--rs-section-py);
  padding-bottom: var(--rs-section-py);
}
.rs-container {
  margin-left: auto;
  margin-right: auto;
  max-width: var(--rs-content-max);
  padding-left: var(--rs-content-px);
  padding-right: var(--rs-content-px);
}
.rs-eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--rs-primary);
  margin-bottom: 12px;
}
.rs-h2 {
  font-size: var(--rs-text-h2);
  font-weight: 700;
  color: var(--rs-text-dark);
  line-height: 1.3;
}
.rs-accent-bar {
  width: 48px;
  height: 3px;
  background: var(--rs-primary);
  margin-top: 20px;
}
/* Hero */
.rs-hero {
  position: relative;
  min-height: min(100svh, 880px);
  display: flex;
  flex-direction: column;
  background: linear-gradient(120deg, #1a1a1a 0%, #2a1416 55%, #3a161a 100%);
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
  background:
    radial-gradient(circle at 78% 30%, rgba(200, 22, 29, 0.28), transparent 42%),
    linear-gradient(0deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.2) 60%);
  pointer-events: none;
}
.rs-hero-tag {
  display: inline-block;
  font-size: 13px;
  letter-spacing: 0.2em;
  color: var(--rs-text-light-sub);
  padding-bottom: 14px;
  border-bottom: 2px solid var(--rs-primary);
  margin-bottom: 28px;
}
.rs-hero-title {
  font-size: var(--rs-text-hero);
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  letter-spacing: -0.01em;
}
/* STYLE2_HERO_CSS2 */
.rs-hero-desc {
  margin-top: 24px;
  font-size: 16px;
  line-height: 1.9;
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
.rs-hero-stats {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.04);
  border-top: 1px solid var(--rs-border-dark);
  backdrop-filter: blur(4px);
}
.rs-hero-stat-item {
  padding: 26px 16px;
  text-align: center;
}
.rs-hero-stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
}
.rs-hero-stat-label {
  font-size: 13px;
  color: var(--rs-text-muted);
  margin-top: 4px;
}
/* STYLE2_BTN_CSS */
.rs-btn-primary {
  padding: 14px 34px;
  background: var(--rs-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  transition: background 0.2s ease;
}
.rs-btn-primary:hover {
  background: var(--rs-primary-light);
}
.rs-btn-ghost {
  padding: 14px 34px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.rs-btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}
.rs-biz-card {
  position: relative;
  background: #fff;
  padding: 36px 28px;
  transition: background 0.25s ease;
}
.rs-biz-card:hover {
  background: var(--rs-bg-cream);
}
/* 后台选定的业务/服务图标；在业务卡片里占序号的位置 */
.rs-card-icon {
  width: 30px;
  height: 30px;
  color: var(--rs-primary);
}
.rs-biz-card > .rs-card-icon {
  position: absolute;
  top: 28px;
  left: 28px;
}
.rs-biz-index {
  position: absolute;
  top: 28px;
  left: 28px;
  font-size: 28px;
  font-weight: 800;
  color: var(--rs-primary);
  opacity: 0.25;
}
.rs-partner-cell {
  background: #fff;
  padding: 28px 16px;
  text-align: center;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}
.rs-partner-cell:hover {
  color: var(--rs-primary);
}
.rs-partner-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 104px;
}
/* 合作伙伴 Logo 灰度展示，悬停恢复原色 */
.rs-partner-logo {
  max-width: 140px;
  max-height: 48px;
  width: auto;
  height: auto;
  object-fit: contain;
  filter: grayscale(1);
  opacity: 0.65;
  transition: filter 0.25s ease, opacity 0.25s ease;
}
.rs-partner-cell:hover .rs-partner-logo {
  filter: none;
  opacity: 1;
}
/* 社会贡献配图悬停轻微放大，只动 transform */
.rs-zoom :deep(img) {
  transition: transform 0.5s ease;
}
.rs-zoom:hover :deep(img) {
  transform: scale(1.05);
}
</style>
