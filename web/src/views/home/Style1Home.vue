<template>
  <div class="s1-home">
    <!-- 首屏：背景图/视频 + 深色遮罩，标语与两个行动入口，底部业绩数据条 -->
    <section class="s1-hero">
      <video v-if="showHeroVideo" class="s1-hero-media" :src="heroVideo" :poster="heroImage || undefined" autoplay muted loop playsinline @error="markHeroVideoFailed" />
      <img v-else-if="heroImage" :src="heroImage" alt="" class="s1-hero-media" width="1920" height="1080" fetchpriority="high" />
      <div class="s1-hero-overlay" aria-hidden="true"></div>
      <div class="s1-glow-orb" aria-hidden="true"></div>

      <div class="s1-hero-inner">
        <div class="s1-hero-content">
          <p class="s1-hero-tag"><span class="s1-tag-dot" aria-hidden="true"></span>{{ heroTag }}</p>
          <h1 class="s1-hero-title">{{ heroTitle }}</h1>
          <p v-if="heroDesc" class="s1-hero-desc">{{ heroDesc }}</p>
          <div class="s1-hero-actions">
            <button type="button" class="s1-btn-primary" @click="scrollToAnchor('business')">{{ heroPrimaryText }}</button>
            <button type="button" class="s1-btn-outline" @click="scrollToAnchor('contact')">{{ heroSecondaryText }}</button>
          </div>
        </div>
      </div>

      <div v-if="sections?.achievements.length" class="s1-stats-bar">
        <div class="s1-container s1-stats-grid">
          <HeroStat v-for="a in sections.achievements.slice(0, 4)" :key="a.id" :value="a.value" :suffix="a.suffix" :label="a.label" />
        </div>
      </div>
    </section>

    <!-- 公司简介 -->
    <section id="about" class="s1-section s1-section--white">
      <div class="s1-container">
        <SkeletonRows v-if="loading" :rows="1" tall />
        <div v-else-if="sections?.about.content" :ref="track('about')" class="s1-about-grid fade-up" :class="{ visible: shown.has('about') }">
          <div>
            <span class="s1-eyebrow">{{ heading('about').eyebrow }}</span>
            <h2 class="s1-h2">{{ sections.about.title || heading('about').eyebrow }}</h2>
            <p v-if="sections.about.subtitle" class="s1-about-subtitle">{{ sections.about.subtitle }}</p>
          </div>
          <p class="s1-about-text">{{ sections.about.content }}</p>
        </div>
        <EmptyState v-else />
      </div>
    </section>

    <!-- 业务与行业 -->
    <section id="business" class="s1-section s1-section--surface">
      <div class="s1-container">
        <Style1Heading v-bind="heading('business')" />
        <SkeletonRows v-if="loading" :rows="4" />
        <div v-else-if="sections?.business.length" class="s1-grid-4">
          <article
            v-for="(item, i) in sections.business"
            :key="item.id"
            :ref="track(`biz-${item.id}`)"
            class="s1-card fade-up"
            :class="[`delay-${(i % 4) * 100}`, { visible: shown.has(`biz-${item.id}`) }]"
          >
            <!-- 后台选了图标显示图标，未选（或图标已下架）回落为序号 -->
            <component :is="homeIconOf(item.icon)" v-if="homeIconOf(item.icon)" class="s1-card-icon" aria-hidden="true" />
            <div v-else class="s1-card-index">{{ String(i + 1).padStart(2, '0') }}</div>
            <h3 class="s1-card-title">{{ item.title }}</h3>
            <p class="s1-card-desc">{{ item.desc }}</p>
          </article>
        </div>
        <EmptyState v-else />
      </div>
    </section>

    <!-- 主要产品：左图右文，图缺失时显示品牌底色占位 -->
    <section id="product" class="s1-section s1-section--white">
      <div class="s1-container">
        <Style1Heading v-bind="heading('product')" />
        <SkeletonRows v-if="loading" :rows="2" tall />
        <div v-else-if="sections?.products.length" class="s1-product-list">
          <article
            v-for="(item, i) in sections.products"
            :key="item.id"
            :ref="track(`product-${item.id}`)"
            class="s1-product fade-up"
            :class="{ visible: shown.has(`product-${item.id}`), 's1-product--reverse': i % 2 === 1 }"
          >
            <div class="s1-product-media">
              <SafeImage :src="item.image" :alt="item.name" :width="640" :height="400" />
            </div>
            <div class="s1-product-body">
              <span class="s1-product-num">{{ String(i + 1).padStart(2, '0') }}</span>
              <h3 class="s1-product-name">{{ item.name }}</h3>
              <p class="s1-product-summary">{{ item.summary }}</p>
              <ul v-if="item.features?.length" class="s1-product-features">
                <li v-for="f in item.features" :key="f">{{ f }}</li>
              </ul>
            </div>
          </article>
        </div>
        <EmptyState v-else />
      </div>
    </section>

    <!-- 技术支持及服务 -->
    <section id="service" class="s1-section s1-section--surface">
      <div class="s1-container">
        <Style1Heading v-bind="heading('service')" />
        <SkeletonRows v-if="loading" :rows="4" />
        <div v-else-if="sections?.services.length" class="s1-grid-4">
          <article
            v-for="(item, i) in sections.services"
            :key="item.id"
            :ref="track(`svc-${item.id}`)"
            class="s1-card s1-card--plain fade-up"
            :class="[`delay-${(i % 4) * 100}`, { visible: shown.has(`svc-${item.id}`) }]"
          >
            <!-- 后台选了图标才显示；服务卡片原本无序号，未选时保持原样 -->
            <component :is="homeIconOf(item.icon)" v-if="homeIconOf(item.icon)" class="s1-card-icon" aria-hidden="true" />
            <h3 class="s1-card-title">{{ item.title }}</h3>
            <p class="s1-card-desc">{{ item.desc }}</p>
          </article>
        </div>
        <EmptyState v-else />
      </div>
    </section>

    <!-- 经营理念 -->
    <section id="philosophy" class="s1-section s1-section--brand">
      <div class="s1-container">
        <div :ref="track('philosophy')" class="s1-philosophy fade-up" :class="{ visible: shown.has('philosophy') }">
          <p class="s1-philosophy-eyebrow">{{ heading('philosophy').eyebrow }}</p>
          <h2 class="s1-philosophy-title">{{ sections?.philosophy.title || site.slogan || heading('philosophy').eyebrow }}</h2>
          <p v-if="sections?.philosophy.content" class="s1-philosophy-body">{{ sections.philosophy.content }}</p>
        </div>
      </div>
    </section>

    <!-- 合作伙伴：有 Logo 展示 Logo（灰度，悬停恢复彩色），无 Logo 展示名称 -->
    <section id="partner" class="s1-section s1-section--white">
      <div class="s1-container">
        <Style1Heading v-bind="heading('partner')" />
        <div v-if="sections?.partners.length" class="s1-partner-grid">
          <component
            :is="safeExternalUrl(p.link) ? 'a' : 'div'"
            v-for="p in sections.partners"
            :key="p.id"
            :href="safeExternalUrl(p.link) || undefined"
            :target="safeExternalUrl(p.link) ? '_blank' : undefined"
            :rel="safeExternalUrl(p.link) ? 'noopener noreferrer' : undefined"
            class="s1-partner"
          >
            <!-- Logo 挂了回退为名称，不显示破图（SRS 图片加载失败） -->
            <img v-if="imgs.usable(p.logo)" :src="p.logo" :alt="p.name" class="s1-partner-logo" width="140" height="48" loading="lazy" @error="imgs.markBroken(p.logo)" />
            <span v-else>{{ p.name }}</span>
          </component>
        </div>
        <EmptyState v-else-if="!loading" />
      </div>
    </section>

    <!-- 公司业绩 -->
    <section id="achievement" class="s1-section s1-section--dark">
      <div class="s1-container">
        <Style1Heading v-bind="heading('achievement')" on-dark />
        <div v-if="sections?.achievements.length" class="s1-achievement-grid">
          <AchievementStat v-for="a in sections.achievements" :key="a.id" :value="a.value" :suffix="a.suffix" :label="a.label" on-dark />
        </div>
        <EmptyState v-else-if="!loading" on-dark />
      </div>
    </section>

    <!-- 我眼中的中瑞恒：媒体报道与行业评价；无内容时整块不显示，不占首页篇幅 -->
    <section v-if="sections?.views?.length" id="view" class="s1-section s1-section--white">
      <div class="s1-container">
        <Style1Heading v-bind="heading('view')" />
        <div class="s1-grid-4">
          <component
            :is="v.link ? 'a' : 'article'"
            v-for="(v, i) in sections.views"
            :key="v.id"
            :ref="track(`view-${v.id}`)"
            :href="v.link || undefined"
            :target="v.link ? '_blank' : undefined"
            :rel="v.link ? 'noopener noreferrer' : undefined"
            class="s1-card s1-view-card fade-up"
            :class="[`delay-${(i % 4) * 100}`, { visible: shown.has(`view-${v.id}`) }]"
          >
            <div v-if="imgs.usable(v.image)" class="s1-view-media">
              <img :src="v.image" :alt="v.title" width="400" height="225" loading="lazy" @error="imgs.markBroken(v.image)" />
            </div>
            <h3 class="s1-card-title">{{ v.title }}</h3>
            <p v-if="v.desc" class="s1-card-desc">{{ v.desc }}</p>
          </component>
        </div>
      </div>
    </section>

    <!-- 社会贡献 -->
    <section id="social" class="s1-section s1-section--surface">
      <div class="s1-container">
        <Style1Heading v-bind="heading('social')" />
        <SkeletonRows v-if="loading" :rows="3" tall />
        <div v-else-if="sections?.social.length" class="s1-grid-3">
          <article
            v-for="(s, i) in sections.social"
            :key="s.id"
            :ref="track(`social-${s.id}`)"
            class="s1-social fade-up"
            :class="[`delay-${i * 100}`, { visible: shown.has(`social-${s.id}`) }]"
          >
            <div class="s1-social-media">
              <SafeImage :src="s.image" :alt="s.title" :width="480" :height="300" />
            </div>
            <div class="s1-social-body">
              <h3 class="s1-card-title">{{ s.title }}</h3>
              <p class="s1-card-desc">{{ s.desc }}</p>
            </div>
          </article>
        </div>
        <EmptyState v-else />
      </div>
    </section>

    <!-- 联系我们 -->
    <section id="contact" class="s1-section s1-section--white">
      <div class="s1-container">
        <Style1Heading v-bind="contactHeading" />
        <ContactSection :site="site" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// 首页样式一（深蓝科技风）：首屏 + 9 大板块，数据来自后台内容管理与基本信息管理
import { ref, computed, onMounted } from 'vue'
import { getHomeSections, recordVisit } from '@/api/home'
import type { HomeSections } from '@/api/home'
import { useSiteStore } from '@/stores/site'
import { API_SUCCESS_CODE } from '@/config'
import { useHeroVideo } from '@/composables/useHeroVideo'
import { useReveal } from '@/composables/useReveal'
import { scrollToAnchor } from '@/composables/useWindowScroll'
import { safeExternalUrl } from '@/utils/sanitize'
import EmptyState from '@/components/sections/EmptyState.vue'
import SafeImage from '@/components/common/SafeImage.vue'
import SkeletonRows from '@/components/common/SkeletonRows.vue'
import AchievementStat from './components/AchievementStat.vue'
import HeroStat from './components/HeroStat.vue'
import Style1Heading from './components/Style1Heading.vue'
import ContactSection from './components/ContactSection.vue'
import { useBrokenImages } from '@/composables/useBrokenImages'
import { useHomeCopy } from '@/composables/useHomeCopy'
import { homeIconOf } from '@/config/homeIcons'

/** 合作伙伴 Logo、「我眼中的中瑞恒」配图失效登记 */
const imgs = useBrokenImages()

const sections = ref<HomeSections | null>(null)
const loading = ref(true)
const siteStore = useSiteStore()
// 站点信息取自 site store，与页眉/页脚共享同一次请求
const site = computed(() => siteStore.site)
const { shown, track } = useReveal()
// 板块标题、首屏按钮、联系板块标题：后台配了用后台，否则内置文案
const { heading, contactHeading, heroPrimaryText, heroSecondaryText } = useHomeCopy(sections, site)

// 首屏文案：主标语、副标语取自基本信息管理，描述取站点描述；未配置时用内置文案
const heroTitle = computed(() => site.value.slogan || '让建筑更节能　让环境更舒适')
const heroTag = computed(() => site.value.subSlogan || '您身边专业的智慧能源提供商')
const heroDesc = computed(() => site.value.description || '')

// 首屏背景媒体：窄屏与减少动效偏好下不播背景视频，回落到背景图
const heroImage = computed(() => site.value.heroImage || sections.value?.backgrounds?.hero || '')
const heroVideo = computed(() => site.value.heroVideo || '')
const { blocked: heroVideoBlocked, markFailed: markHeroVideoFailed } = useHeroVideo()
const showHeroVideo = computed(() => !!heroVideo.value && !heroVideoBlocked.value)

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
