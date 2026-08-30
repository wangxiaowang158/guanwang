<template>
  <div class="rs-home">
    <!-- 首屏 Hero：满屏深色大图叠加，编辑式大标题；可配背景图/视频 -->
    <section class="rs-hero">
      <!-- 背景媒体层：视频优先，其次图片，垫在深色渐变之上、蒙版之下 -->
      <video v-if="heroVideo" class="rs-hero-media" :src="heroVideo" autoplay muted loop playsinline></video>
      <img v-else-if="heroImage" :src="heroImage" alt="" class="rs-hero-media" />
      <div class="rs-hero-overlay"></div>
      <div class="relative z-10 mx-auto px-6 lg:px-10 w-full" style="max-width: var(--rs-content-max)">
        <div class="max-w-3xl">
          <div class="rs-hero-tag">ZRUIHENG GROUP · 智慧能源</div>
          <h1 class="rs-hero-title">
            让建筑更<span style="color: var(--rs-primary-light)">节能</span><br />
            让环境更<span style="color: var(--rs-primary-light)">舒适</span>
          </h1>
          <p class="rs-hero-desc">
            {{ site.subSlogan || '您身边专业的智慧能源提供商' }}——立足智慧能源领域，以数字化方式重构能源系统，提供多场景数智解决方案。
          </p>
          <div class="flex flex-wrap gap-4 mt-9">
            <button class="rs-btn-primary" @click="scrollTo('business')">了解集团业务</button>
            <button class="rs-btn-ghost" @click="scrollTo('contact')">联系我们</button>
          </div>
        </div>
      </div>
      <!-- 底部数据条 -->
      <div class="rs-hero-stats">
        <div class="mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-px" style="max-width: var(--rs-content-max)">
          <div v-for="a in heroStats" :key="a.label" class="rs-hero-stat-item">
            <div class="rs-hero-stat-value">{{ a.value }}</div>
            <div class="rs-hero-stat-label">{{ a.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 公司简介：编辑式左右分栏 -->
    <section id="about" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div class="lg:col-span-4">
          <p class="rs-eyebrow">关于集团</p>
          <h2 class="rs-h2">{{ sections?.about.title || '集团简介' }}</h2>
          <div class="rs-accent-bar"></div>
        </div>
        <div class="lg:col-span-8">
          <p v-if="sections?.about.subtitle" class="text-base font-medium mb-4" style="color: var(--rs-primary)">{{ sections.about.subtitle }}</p>
          <p class="text-base leading-loose" style="color: var(--rs-text-body)">{{ sections?.about.content }}</p>
        </div>
      </div>
    </section>
    <!-- 业务与行业：深色底，序号编号陈列 -->
    <section id="business" class="rs-section scroll-mt-20" style="background: var(--rs-bg-cream)">
      <div class="rs-container">
        <p class="rs-eyebrow">业务与行业</p>
        <h2 class="rs-h2 mb-12">覆盖能源全链路的专业服务方向</h2>
        <EmptyState v-if="!sections?.business.length" />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px" style="background: var(--rs-border)">
          <article
            v-for="(item, i) in sections.business"
            :key="item.id"
            class="rs-biz-card"
          >
            <span class="rs-biz-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="text-lg font-bold mb-3 mt-6" style="color: var(--rs-text-dark)">{{ item.title }}</h3>
            <p class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ item.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 主要产品：编辑式横向条目 -->
    <section id="product" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container">
        <p class="rs-eyebrow">主要产品</p>
        <h2 class="rs-h2 mb-12">面向建筑能源全生命周期的核心产品</h2>
        <EmptyState v-if="!sections?.products.length" />
        <div v-else class="divide-y" style="border-color: var(--rs-border)">
          <article v-for="item in sections.products" :key="item.id" class="grid grid-cols-1 lg:grid-cols-3 gap-8 py-9 first:pt-0">
            <div class="lg:col-span-1">
              <h3 class="text-xl font-bold mb-3" style="color: var(--rs-text-dark)">{{ item.name }}</h3>
              <p class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ item.summary }}</p>
            </div>
            <ul class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 self-center">
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
        <p class="rs-eyebrow">技术支持及服务</p>
        <h2 class="rs-h2 mb-12">全周期的专业能源技术服务</h2>
        <EmptyState v-if="!sections?.services.length" />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <article v-for="item in sections.services" :key="item.id" class="bg-white p-7 border-t-2" style="border-color: var(--rs-primary)">
            <h3 class="text-base font-bold mb-3" style="color: var(--rs-text-dark)">{{ item.title }}</h3>
            <p class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ item.desc }}</p>
          </article>
        </div>
      </div>
    </section>
    <!-- 经营理念：深色满幅大字 -->
    <section id="philosophy" class="rs-section scroll-mt-20" style="background: var(--rs-bg-dark)">
      <div class="rs-container text-center max-w-3xl">
        <div class="rs-accent-bar mx-auto"></div>
        <h2 class="text-3xl md:text-4xl font-bold text-white mt-6 mb-6 leading-snug">{{ sections?.philosophy.title || '经营理念' }}</h2>
        <p class="text-base leading-loose" style="color: var(--rs-text-light-sub)">{{ sections?.philosophy.content }}</p>
      </div>
    </section>

    <!-- 合作伙伴 -->
    <section id="partner" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container">
        <p class="rs-eyebrow">合作伙伴</p>
        <h2 class="rs-h2 mb-12">与主流品牌携手共建能源生态</h2>
        <EmptyState v-if="!sections?.partners.length" />
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px" style="background: var(--rs-border)">
          <component
            :is="p.link ? 'a' : 'div'"
            v-for="p in sections.partners"
            :key="p.id"
            :href="p.link || undefined"
            :target="p.link ? '_blank' : undefined"
            :rel="p.link ? 'noopener noreferrer' : undefined"
            class="rs-partner-cell"
          >{{ p.name }}</component>
        </div>
      </div>
    </section>

    <!-- 公司业绩（数字滚动动效） -->
    <section id="achievement" class="rs-section scroll-mt-20" style="background: var(--rs-bg-cream)">
      <div class="rs-container">
        <EmptyState v-if="!sections?.achievements.length" />
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div v-for="a in sections.achievements" :key="a.id" class="text-center">
            <AchievementStat :value="a.value" :suffix="a.suffix" :label="a.label" accent="var(--rs-primary)" />
          </div>
        </div>
      </div>
    </section>

    <!-- 社会贡献 -->
    <section id="social" class="rs-section bg-white scroll-mt-20">
      <div class="rs-container">
        <p class="rs-eyebrow">社会贡献</p>
        <h2 class="rs-h2 mb-12">践行绿色低碳发展使命</h2>
        <EmptyState v-if="!sections?.social.length" />
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article v-for="s in sections.social" :key="s.id" class="group">
            <div class="h-52 overflow-hidden mb-5" style="background: var(--rs-bg-cream)">
              <img v-if="s.image" :src="s.image" :alt="s.title" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" width="400" height="208" loading="lazy" />
              <div v-else class="w-full h-full flex items-center justify-center" style="color: var(--rs-border)">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>
              </div>
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
        <p class="rs-eyebrow">联系我们</p>
        <h2 class="rs-h2 mb-12">留下您的需求，我们将尽快与您联系</h2>
        <ContactSection :site="site" />
      </div>
    </section>
  </div>
</template>
<!-- STYLE2_HOME_SCRIPT -->
<script setup lang="ts">
// 样式二首页（集团品牌风）：复用首页聚合数据，仅呈现层不同
import { ref, computed, inject, onMounted } from 'vue'
import { getHomeSections, recordVisit } from '@/api/home'
import type { HomeSections } from '@/api/home'
import { useSiteStore } from '@/stores/site'
import EmptyState from '@/components/sections/EmptyState.vue'
import AchievementStat from './components/AchievementStat.vue'
import ContactSection from './components/ContactSection.vue'

const sections = ref<HomeSections | null>(null)
const siteStore = useSiteStore()
// 站点信息取自 site store，与页眉/页脚共享同一次请求
const site = computed(() => siteStore.site)

// Hero 背景媒体：视频优先，其次背景图（站点配置优先，回退板块背景配置 backgrounds.hero）
const heroImage = computed(() => site.value.heroImage || sections.value?.backgrounds?.hero || '')
const heroVideo = computed(() => site.value.heroVideo || '')

// Hero 数据条：取前 4 项业绩，无数据时为空数组（模板自然不渲染）
const heroStats = computed(() =>
  (sections.value?.achievements || []).slice(0, 4).map((a) => ({
    value: `${a.value}${a.suffix}`,
    label: a.label,
  }))
)

const scrollToAnchor = inject<(hash: string) => void>('scrollToAnchor')
function scrollTo(id: string) {
  if (scrollToAnchor) scrollToAnchor(`#${id}`)
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(async () => {
  recordVisit('首页').catch(() => {})
  // 站点信息走 store（已去重），首页板块数据本页独有
  siteStore.fetchSite()
  try {
    const secRes = await getHomeSections()
    if (secRes.code === 0 && secRes.data) sections.value = secRes.data
  } catch {
    sections.value = null
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
  min-height: 88vh;
  display: flex;
  align-items: center;
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
.rs-hero-stats {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
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
</style>
