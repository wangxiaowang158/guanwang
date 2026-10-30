<template>
  <!-- 样式一 / 三栏目页头图：左对齐大字标题 + 当前位置导航；配背景图时叠黑色遮罩，未配时为纯黑底 -->
  <section class="page-hero" :style="bg ? { backgroundImage: `url('${bg}')` } : undefined" :class="{ 'page-hero--img': bg || video }">
    <HeroVideoLayer :src="video" :poster="bg" />
    <div class="page-hero-overlay" aria-hidden="true"></div>
    <div class="relative site-container">
      <nav class="page-hero-crumb" aria-label="当前位置">
        <RouterLink to="/">首页</RouterLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{{ crumb || title }}</span>
      </nav>
      <p v-if="eyebrow" class="page-hero-eyebrow">{{ eyebrow }}</p>
      <h1 class="page-hero-title">{{ title }}</h1>
      <p v-if="desc" class="page-hero-desc">{{ desc }}</p>
      <!-- 转化入口位（如预约演示），页面按需传入；窄屏随内容换行，不溢出 -->
      <div v-if="$slots.actions" class="page-hero-actions"><slot name="actions" /></div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 栏目页顶部视觉区，纯展示组件；bg 为背景图地址（栏目管理或 Banner 管理），为空时用品牌深色底
import HeroVideoLayer from './HeroVideoLayer.vue'

defineProps<{
  eyebrow: string
  title: string
  desc: string
  bg?: string
  /** 背景视频地址，静音循环播放，bg 作首帧 */
  video?: string
  /** 当前位置末级显示的栏目名，缺省时用主标题 */
  crumb?: string
}>()
</script>

<style scoped>
.page-hero {
  position: relative;
  overflow: hidden;
  padding: calc(var(--nav-h) + clamp(64px, 9vw, 120px)) 0 clamp(64px, 8vw, 112px);
  /* 样式一（深色）与样式三（黑白交替）用本组件，页头横幅恒为纯黑底大字 */
  background-color: #000;
  background-size: cover;
  background-position: center;
}
/* 无图：纯黑底，只在底部压一层极淡的灰，把横幅与下方内容区分开；不用网格与彩色光晕 */
.page-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(255, 255, 255, 0.04) 100%);
}
/* 有图：左深右浅的黑色遮罩，保证左侧白字在任意照片上可读 */
.page-hero--img .page-hero-overlay {
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.25) 100%);
}
.page-hero-crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}
.page-hero-crumb a { transition: color var(--dur-fast); }
.page-hero-crumb a:hover { color: #fff; }
.page-hero-crumb [aria-current] { color: #fff; }
.page-hero-eyebrow {
  margin: 0 0 14px;
  font-size: var(--text-fs-body-lg);
  font-weight: 600;
  color: #a1a1a6;
}
.page-hero-title {
  margin: 0;
  font-size: var(--text-fs-display);
  font-weight: 700;
  line-height: 1.1;
  color: #fff;
}
.page-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}
.page-hero-desc {
  margin: 16px 0 0;
  max-width: 720px;
  font-size: var(--text-fs-body-lg);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
}
</style>
