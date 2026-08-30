<template>
  <div class="s1-home">
    <!-- ══════════════════════════════════════════
         Hero：全屏高度，动态粒子网格背景
    ══════════════════════════════════════════ -->
    <section class="s1-hero">
      <!-- 背景媒体层 -->
      <video v-if="heroVideo" class="s1-hero-media" :src="heroVideo" autoplay muted loop playsinline />
      <img v-else-if="heroImage" :src="heroImage" alt="" class="s1-hero-media" width="1920" height="1080" fetchpriority="high" />
      <!-- 科技网格遮罩 -->
      <div class="s1-hero-overlay"></div>
      <!-- 流光线条装饰 -->
      <div class="s1-glow-line s1-glow-line--1" aria-hidden="true"></div>
      <div class="s1-glow-line s1-glow-line--2" aria-hidden="true"></div>
      <div class="s1-glow-orb" aria-hidden="true"></div>

      <div class="s1-hero-inner">
        <div class="s1-hero-content fade-up visible">
          <div class="s1-hero-tag">
            <span class="s1-tag-dot"></span>
            {{ site.subSlogan || '您身边专业的智慧能源提供商' }}
          </div>
          <h1 class="s1-hero-title">
            让建筑更<em>节能</em><br />让环境更<em>舒适</em>
          </h1>
          <p class="s1-hero-desc">
            立足智慧能源领域，以数字化方式重构能源系统，提供暖通空调系统集成、合同能源管理（EMC）、综合能源节能等多场景数智解决方案。
          </p>
          <div class="s1-hero-actions">
            <button class="s1-btn-primary" @click="scrollTo('business')">了解业务</button>
            <button class="s1-btn-outline" @click="scrollTo('contact')">联系我们</button>
          </div>
        </div>
      </div>

      <!-- 数据统计条 -->
      <div class="s1-stats-bar">
        <div class="s1-container s1-stats-grid">
          <div v-for="a in statItems" :key="a.label" class="s1-stat-item">
            <div class="s1-stat-value" :ref="(el) => registerStatEl(el as HTMLElement, a)">
              {{ a.display }}<span>{{ a.suffix }}</span>
            </div>
            <div class="s1-stat-label">{{ a.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         公司简介
    ══════════════════════════════════════════ -->
    <section id="about" class="s1-section s1-section--white scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-about-grid fade-up" v-intersect>
          <div class="s1-about-label">
            <span class="s1-eyebrow">公司简介</span>
            <h2 class="s1-h2">{{ sections?.about.title || '您身边专业的智慧能源提供商' }}</h2>
            <p v-if="sections?.about.subtitle" class="s1-about-subtitle">{{ sections.about.subtitle }}</p>
          </div>
          <div class="s1-about-body">
            <p class="s1-about-text">{{ sections?.about.content }}</p>
            <div class="s1-about-tags">
              <span class="s1-badge">国家高新技术企业</span>
              <span class="s1-badge">专精特新"小巨人"</span>
              <span class="s1-badge">13 年行业深耕</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         业务与行业
    ══════════════════════════════════════════ -->
    <section id="business" class="s1-section s1-section--surface scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-section-head fade-up" v-intersect>
          <span class="s1-eyebrow">业务与行业</span>
          <h2 class="s1-h2">覆盖能源全链路的专业服务方向</h2>
        </div>
        <div class="s1-biz-grid" v-if="sections?.business.length">
          <article
            v-for="(item, i) in sections.business"
            :key="item.id"
            class="s1-biz-card fade-up"
            v-intersect
            :class="`delay-${(i % 4) * 100}`"
          >
            <div class="s1-biz-index">{{ String(i + 1).padStart(2, '0') }}</div>
            <div class="s1-biz-icon">
              <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
            </div>
            <h3 class="s1-biz-title">{{ item.title }}</h3>
            <p class="s1-biz-desc">{{ item.desc }}</p>
          </article>
        </div>
        <div v-else class="s1-empty">暂无内容</div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         主要产品
    ══════════════════════════════════════════ -->
    <section id="product" class="s1-section s1-section--white scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-section-head fade-up" v-intersect>
          <span class="s1-eyebrow">主要产品</span>
          <h2 class="s1-h2">面向建筑能源全生命周期的核心产品</h2>
        </div>
        <div v-if="sections?.products.length" class="s1-product-list">
          <article
            v-for="(item, i) in sections.products"
            :key="item.id"
            class="s1-product-card fade-up"
            v-intersect
            :class="`delay-${i * 100}`"
          >
            <div class="s1-product-num">{{ String(i + 1).padStart(2, '0') }}</div>
            <div class="s1-product-info">
              <h3 class="s1-product-name">{{ item.name }}</h3>
              <p class="s1-product-summary">{{ item.summary }}</p>
            </div>
            <ul class="s1-product-features">
              <li v-for="f in item.features" :key="f">
                <svg class="s1-check" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                {{ f }}
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         技术支持及服务
    ══════════════════════════════════════════ -->
    <section id="service" class="s1-section s1-section--surface scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-section-head fade-up" v-intersect>
          <span class="s1-eyebrow">技术支持及服务</span>
          <h2 class="s1-h2">全周期的专业能源技术服务</h2>
        </div>
        <div v-if="sections?.services.length" class="s1-service-grid">
          <article
            v-for="(item, i) in sections.services"
            :key="item.id"
            class="s1-service-card fade-up"
            v-intersect
            :class="`delay-${(i % 4) * 100}`"
          >
            <div class="s1-service-icon">
              <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="s1-service-title">{{ item.title }}</h3>
            <p class="s1-service-desc">{{ item.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         经营理念（品牌色全宽背景）
    ══════════════════════════════════════════ -->
    <section id="philosophy" class="s1-section s1-section--brand scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-philosophy-wrap fade-up" v-intersect>
          <div class="s1-philosophy-deco" aria-hidden="true"></div>
          <p class="s1-philosophy-eyebrow">经营理念</p>
          <h2 class="s1-philosophy-title">{{ sections?.philosophy.title || '让建筑更节能　让环境更舒适' }}</h2>
          <p class="s1-philosophy-body">{{ sections?.philosophy.content }}</p>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         公司业绩
    ══════════════════════════════════════════ -->
    <section id="achievement" class="s1-section s1-section--dark scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-achievement-grid" v-if="sections?.achievements.length">
          <div
            v-for="a in sections.achievements"
            :key="a.id"
            class="s1-achievement-item fade-up"
            v-intersect
          >
            <AchievementStat :value="a.value" :suffix="a.suffix" :label="a.label" accent="#38bdf8" />
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         合作伙伴
    ══════════════════════════════════════════ -->
    <section id="partner" class="s1-section s1-section--white scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-section-head fade-up" v-intersect>
          <span class="s1-eyebrow">合作伙伴</span>
          <h2 class="s1-h2">与主流品牌携手共建能源生态</h2>
        </div>
        <div v-if="sections?.partners.length" class="s1-partner-grid fade-up" v-intersect>
          <component
            :is="p.link ? 'a' : 'div'"
            v-for="p in sections.partners"
            :key="p.id"
            :href="p.link || undefined"
            :target="p.link ? '_blank' : undefined"
            :rel="p.link ? 'noopener noreferrer' : undefined"
            class="s1-partner-item"
          >
            <img v-if="p.logo" :src="p.logo" :alt="p.name" class="s1-partner-logo" width="120" height="40" loading="lazy" />
            <span v-else>{{ p.name }}</span>
          </component>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         社会贡献
    ══════════════════════════════════════════ -->
    <section id="social" class="s1-section s1-section--surface scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-section-head fade-up" v-intersect>
          <span class="s1-eyebrow">社会贡献</span>
          <h2 class="s1-h2">践行绿色低碳发展使命</h2>
        </div>
        <div v-if="sections?.social.length" class="s1-social-grid">
          <article
            v-for="(s, i) in sections.social"
            :key="s.id"
            class="s1-social-card fade-up"
            v-intersect
            :class="`delay-${i * 100}`"
          >
            <div class="s1-social-img">
              <img v-if="s.image" :src="s.image" :alt="s.title" class="s1-social-photo" width="400" height="200" loading="lazy" />
              <div v-else class="s1-social-placeholder">
                <svg fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            </div>
            <div class="s1-social-body">
              <h3 class="s1-social-title">{{ s.title }}</h3>
              <p class="s1-social-desc">{{ s.desc }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════
         联系我们
    ══════════════════════════════════════════ -->
    <section id="contact" class="s1-section s1-section--white scroll-mt-[68px]">
      <div class="s1-container">
        <div class="s1-section-head fade-up" v-intersect>
          <span class="s1-eyebrow">联系我们</span>
          <h2 class="s1-h2">留下需求，我们尽快与您联系</h2>
        </div>
        <ContactSection :site="site" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// 首页样式一（亮色现代科技风）：聚合 9 大板块，数据来自后台
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import { getHomeSections, recordVisit } from '@/api/home'
import type { HomeSections, AchievementItem } from '@/api/home'
import { useSiteStore } from '@/stores/site'
import AchievementStat from './components/AchievementStat.vue'
import ContactSection from './components/ContactSection.vue'

const sections = ref<HomeSections | null>(null)
const siteStore = useSiteStore()
// 站点信息取自 site store，与页眉/页脚共享同一次请求
const site = computed(() => siteStore.site)

// Hero 背景媒体
const heroImage = computed(() => site.value.heroImage || sections.value?.backgrounds?.hero || '')
const heroVideo = computed(() => site.value.heroVideo || '')

// 统计条数据：带 countUp display
interface StatItem extends AchievementItem { display: number }
const statItems = ref<StatItem[]>([])
const statObservers: IntersectionObserver[] = []

/** 为每个统计元素注册 countUp IntersectionObserver */
function registerStatEl(el: HTMLElement | null, item: StatItem) {
  if (!el || item.display !== 0) return
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return
      const start = performance.now()
      const duration = 1400
      const ease = (t: number) => 1 - Math.pow(1 - t, 3)
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        item.display = Math.round(ease(p) * item.value)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      obs.disconnect()
    })
  }, { threshold: 0.5 })
  obs.observe(el)
  statObservers.push(obs)
}

// 锚点定位（由 App.vue 提供）
const scrollToAnchor = inject<(hash: string) => void>('scrollToAnchor')
function scrollTo(id: string) {
  if (scrollToAnchor) scrollToAnchor(`#${id}`)
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// v-intersect 自定义指令：元素进入视口时添加 visible class
const vIntersect = {
  mounted(el: HTMLElement) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          el.classList.add('visible')
          obs.unobserve(el)
        }
      })
    }, { threshold: 0.12 })
    obs.observe(el)
    ;(el as any).__intersectObs__ = obs
  },
  unmounted(el: HTMLElement) {
    ;(el as any).__intersectObs__?.disconnect()
  }
}

onMounted(async () => {
  recordVisit('首页').catch(() => {})
  // 站点信息走 store（已去重），首页板块数据本页独有
  siteStore.fetchSite()
  try {
    const secRes = await getHomeSections()
    if (secRes.code === 0 && secRes.data) {
      sections.value = secRes.data
      // 初始化统计条数据
      statItems.value = (secRes.data.achievements || []).map(a => ({ ...a, display: 0 }))
    }
  } catch {
    sections.value = null
  }
})

onBeforeUnmount(() => {
  statObservers.forEach(obs => obs.disconnect())
})
</script>

<style scoped>
/* ── 容器 / 通用 ── */
.s1-home { background: var(--zrh-bg-page); }
.s1-container {
  max-width: var(--zrh-content-max);
  margin: 0 auto;
  padding: 0 var(--zrh-content-px);
}
.s1-section { padding: var(--zrh-section-py) 0; }
.s1-section--white   { background: var(--zrh-bg-white); }
.s1-section--surface { background: var(--zrh-bg-surface); }
.s1-section--dark    { background: var(--zrh-bg-dark); }
.s1-section--brand   { background: var(--brand-primary); }

/* 通用标题区 */
.s1-section-head { text-align: center; margin-bottom: 56px; }
.s1-eyebrow {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brand-primary);
  margin-bottom: 12px;
}
.s1-h2 {
  font-size: var(--zrh-text-h2);
  font-weight: 700;
  color: var(--zrh-text-h);
  line-height: 1.25;
  margin: 0;
}
.s1-empty { text-align: center; color: var(--zrh-text-light); padding: 40px 0; }

/* ── Hero ── */
.s1-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--zrh-bg-dark);
}
.s1-hero-media {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
}
/* 深色网格遮罩 */
.s1-hero-overlay {
  position: absolute; inset: 0; z-index: 1;
  background:
    linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.55) 60%, rgba(15,23,42,0.80) 100%),
    repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(148,163,184,0.06) 60px),
    repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(148,163,184,0.06) 60px);
}
/* 流光装饰线 */
.s1-glow-line {
  position: absolute; z-index: 2;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--brand-primary-light), transparent);
  animation: glow-sweep 6s ease-in-out infinite;
  pointer-events: none;
}
.s1-glow-line--1 { top: 28%; left: -10%; width: 60%; opacity: 0.5; animation-delay: 0s; }
.s1-glow-line--2 { top: 62%; left: 30%; width: 80%; opacity: 0.3; animation-delay: 3s; }
@keyframes glow-sweep {
  0%   { transform: translateX(-20%); opacity: 0; }
  30%  { opacity: 1; }
  70%  { opacity: 0.6; }
  100% { transform: translateX(40%); opacity: 0; }
}
/* 光晕球 */
.s1-glow-orb {
  position: absolute; z-index: 1;
  width: 700px; height: 700px;
  top: -200px; right: -150px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--brand-primary-glow) 0%, transparent 70%);
  pointer-events: none;
}
/* Hero 内容 */
.s1-hero-inner {
  position: relative; z-index: 3;
  flex: 1;
  display: flex; align-items: center;
  padding: 120px var(--zrh-content-px) 80px;
  max-width: calc(var(--zrh-content-max) + 2 * var(--zrh-content-px));
  margin: 0 auto; width: 100%;
}
.s1-hero-content { max-width: 680px; }
.s1-hero-tag {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--brand-primary-light);
  font-weight: 500; letter-spacing: 0.04em;
  margin-bottom: 24px;
}
.s1-tag-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--brand-primary-light);
  box-shadow: 0 0 8px var(--brand-primary-light);
  animation: pulse-dot 2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.5); }
}
.s1-hero-title {
  font-size: var(--zrh-text-hero);
  font-weight: 800; line-height: 1.15;
  color: #fff; margin: 0 0 24px;
  letter-spacing: -0.02em;
}
.s1-hero-title em {
  font-style: normal;
  color: var(--brand-primary-light);
}
.s1-hero-desc {
  font-size: 17px; line-height: 1.8;
  color: rgba(226,232,240,0.85);
  margin: 0 0 40px; max-width: 560px;
}
.s1-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.s1-btn-primary {
  padding: 14px 32px;
  background: var(--brand-primary);
  color: #fff; font-size: 15px; font-weight: 600;
  border: none; border-radius: 10px; cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px var(--brand-primary-glow);
}
.s1-btn-primary:hover {
  background: var(--brand-primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px var(--brand-primary-glow);
}
.s1-btn-outline {
  padding: 14px 32px;
  background: transparent;
  color: rgba(226,232,240,0.9); font-size: 15px; font-weight: 500;
  border: 1px solid rgba(148,163,184,0.4); border-radius: 10px; cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.s1-btn-outline:hover {
  border-color: rgba(148,163,184,0.8);
  background: rgba(255,255,255,0.06);
}
</style>

