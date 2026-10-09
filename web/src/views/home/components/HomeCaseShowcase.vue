<template>
  <!-- 标杆案例：数据看板 + 横向滚动案例卡片 + 查看全部案例；案例与指标均缺失时整块不渲染 -->
  <HomeBlock v-if="cases.length || metrics.length" id="case-showcase" eyebrow="标杆案例" title="用数据说话的落地成果" :style2="style2" tone="white">
    <component :is="style2 ? Style2MetricBoard : MetricBoard" v-if="metrics.length" :items="metrics" />

    <!-- 横向滚动：scroll-snap 吸附，窄屏手指滑动；可聚焦以便键盘用方向键滚动 -->
    <div v-if="cases.length" class="hc-scroll" tabindex="0" role="region" aria-label="标杆案例横向列表">
      <ul class="hc-track">
        <li v-for="c in cases" :key="c.id" class="hc-item">
          <ItemLink :item="c" link-class="hc-link" class="hc-card" :class="{ 'hc-card--s2': style2 }">
            <div class="hc-media">
              <SafeImage :src="c.image" :fallback="fallbackImage" :alt="c.title" :width="360" :height="225" />
            </div>
            <div class="hc-body">
              <ul v-if="chipsOf(c).length" class="hc-chips" aria-label="业务线与行业">
                <li v-for="chip in chipsOf(c)" :key="chip" class="hc-chip">{{ chip }}</li>
              </ul>
              <h3 class="hc-title">{{ c.title }}</h3>
              <p v-if="c.desc" class="hc-desc">{{ c.desc }}</p>
            </div>
          </ItemLink>
        </li>
      </ul>
    </div>

    <div class="hc-cta">
      <RouterLink to="/case" class="hc-btn" :class="{ 'hc-btn--s2': style2 }">查看全部案例</RouterLink>
    </div>
  </HomeBlock>
</template>

<script setup lang="ts">
// 首页标杆案例：指标看板复用 MetricBoard 两套模板，案例卡片横向滚动，数据见 useCaseShowcase
import type { ExtraMetric, PageItem } from '@/api/page'
import { defaultImageOf } from '@/config/defaultImages'
import SafeImage from '@/components/common/SafeImage.vue'
import ItemLink from '@/components/sections/ItemLink.vue'
import MetricBoard from '@/components/sections/MetricBoard.vue'
import Style2MetricBoard from '@/components/sections/Style2MetricBoard.vue'
import { chipsOf } from '@/components/sections/itemChips'
import HomeBlock from './HomeBlock.vue'

defineProps<{ cases: PageItem[]; metrics: ExtraMetric[]; style2?: boolean }>()

/** 案例未配图时的缺省配图 */
const fallbackImage = defaultImageOf('case')
</script>

<style scoped>
.hc-scroll { margin-top: 40px; overflow-x: auto; scroll-snap-type: x proximity; padding-bottom: 12px; }
.hc-track { display: flex; gap: 20px; margin: 0; padding: 0; list-style: none; }
/* 固定卡宽：窄屏露出下一张的边缘，提示可横向滑动 */
.hc-item { flex: 0 0 min(300px, 78vw); scroll-snap-align: start; min-width: 0; }
.hc-card { display: block; height: 100%; background: #fff; border: 1px solid var(--color-line); border-radius: var(--radius-lg); overflow: hidden; }
.hc-card--s2 { border-radius: 0; border-color: var(--rs-border); }
.hc-link:hover .hc-title { color: var(--color-brand-600); }
.hc-card--s2.hc-link:hover .hc-title { color: var(--rs-primary); }
.hc-media { aspect-ratio: 16 / 10; overflow: hidden; background: var(--color-surface); }
.hc-body { padding: 16px 18px 20px; }
.hc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; padding: 0; list-style: none; }
.hc-chip { padding: 1px 8px; font-size: 12px; color: var(--color-ink-700); border: 1px solid var(--color-line); }
.hc-title { margin: 0 0 6px; font-size: 16px; font-weight: 700; line-height: 1.5; color: var(--color-ink-900); overflow-wrap: anywhere; transition: color var(--dur-fast); }
.hc-desc { margin: 0; font-size: 14px; line-height: 1.7; color: var(--color-ink-500); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.hc-cta { margin-top: 32px; text-align: center; }
.hc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 32px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-brand-600);
  border-radius: var(--radius-md);
}
.hc-btn:hover { background: var(--color-brand-700); }
.hc-btn--s2 { background: var(--rs-primary); border-radius: 0; }
.hc-btn--s2:hover { background: var(--rs-primary); filter: brightness(0.92); }
@media (max-width: 640px) {
  /* 窄屏 CTA 通栏，保证转化按钮显眼且易点 */
  .hc-btn { width: 100%; }
}
</style>
