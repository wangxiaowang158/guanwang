<template>
  <!-- 样式二栏目 Hero：黑底左对齐白色大字；bg 配置背景图时叠黑色遮罩 -->
  <section class="rs-page-hero" :class="{ 'rs-page-hero--img': bg || video }" :style="bg ? { backgroundImage: `url('${bg}')` } : undefined">
    <HeroVideoLayer :src="video" :poster="bg" />
    <div class="rs-page-hero-overlay"></div>
    <div class="relative z-10 mx-auto px-6 lg:px-10 w-full" style="max-width: var(--rs-content-max)">
      <nav class="rs-page-hero-crumb" aria-label="当前位置">
        <RouterLink to="/">首页</RouterLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{{ crumb || title }}</span>
      </nav>
      <div v-if="eyebrow" class="rs-page-hero-tag">{{ eyebrow }}</div>
      <h1 class="rs-page-hero-title">{{ title }}</h1>
      <p v-if="desc" class="rs-page-hero-desc">{{ desc }}</p>
      <!-- 转化入口位（如预约演示），页面按需传入；窄屏随内容换行，不溢出 -->
      <div v-if="$slots.actions" class="rs-page-hero-actions"><slot name="actions" /></div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 样式二栏目页顶部视觉区，纯展示组件；bg 为背景图地址（来自后台配置）
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
/* 栏目页头恒为黑底白字（有图时再压黑遮罩），原因见下方 .rs-page-hero 的注释 */
.rs-page-hero {
  position: relative;
  padding-top: calc(76px + clamp(64px, 9vw, 120px));
  padding-bottom: clamp(64px, 8vw, 112px);
  /* 无图时也是黑底白字：样式二顶栏在栏目页首屏上是透明底白字（Style2Header 的 DARK_HERO_ROUTES），
     浅底会让顶栏文字看不见 */
  background: #000;
  overflow: hidden;
  --hero-ink: #f5f5f7;
  --hero-sub: #a1a1a6;
}
/* 配置背景图：覆盖底色铺满，叠加黑色蒙版保证白字可读 */
.rs-page-hero--img {
  background-color: #000;
  background-size: cover;
  background-position: center;
  --hero-ink: #fff;
  --hero-sub: rgba(255, 255, 255, 0.8);
}
.rs-page-hero--img .rs-page-hero-overlay {
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.5) 60%, rgba(0, 0, 0, 0.25) 100%);
}
.rs-page-hero-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.rs-page-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}
.rs-page-hero-crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  font-size: 13px;
  color: var(--hero-sub);
}
.rs-page-hero-crumb a:hover,
.rs-page-hero-crumb [aria-current] {
  color: var(--hero-ink);
}
/* 眉标：常规灰字，不用彩色下划线与加宽字距 */
.rs-page-hero-tag {
  margin-bottom: 14px;
  font-size: var(--text-fs-body-lg);
  font-weight: 600;
  color: var(--hero-sub);
}
.rs-page-hero-title {
  font-size: var(--rs-text-hero);
  font-weight: 700;
  color: var(--hero-ink);
  line-height: 1.1;
  margin-bottom: 20px;
}
.rs-page-hero-desc {
  font-size: var(--text-fs-body-lg);
  line-height: 1.6;
  color: var(--hero-sub);
  max-width: 48rem;
}
</style>
