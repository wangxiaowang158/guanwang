<template>
  <!-- 样式二栏目 Hero：深色编辑式，左对齐大标题 + 红色装饰条；bg 配置背景图时叠加于底色 -->
  <section class="rs-page-hero" :class="{ 'rs-page-hero--img': bg }" :style="bg ? { backgroundImage: `url('${bg}')` } : undefined">
    <div class="rs-page-hero-overlay"></div>
    <div class="relative z-10 mx-auto px-6 lg:px-10 w-full" style="max-width: var(--rs-content-max)">
      <div class="rs-page-hero-tag">{{ eyebrow }}</div>
      <h1 class="rs-page-hero-title">{{ title }}</h1>
      <p class="rs-page-hero-desc">{{ desc }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
// 样式二栏目页顶部视觉区，纯展示组件；bg 为背景图地址（来自后台配置）
defineProps<{
  eyebrow: string
  title: string
  desc: string
  bg?: string
}>()
</script>

<style scoped>
.rs-page-hero {
  position: relative;
  padding-top: 140px;
  padding-bottom: 64px;
  background: linear-gradient(120deg, #1a1a1a 0%, #2a1416 60%, #3a161a 100%);
  overflow: hidden;
}
/* 配置背景图：覆盖底色铺满，叠加深色蒙版保证文字可读 */
.rs-page-hero--img {
  background-size: cover;
  background-position: center;
}
.rs-page-hero--img .rs-page-hero-overlay {
  background: linear-gradient(120deg, rgba(20, 20, 20, 0.78), rgba(40, 20, 22, 0.55));
}
.rs-page-hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 82% 25%, rgba(200, 22, 29, 0.25), transparent 45%);
  pointer-events: none;
}
.rs-page-hero-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rs-text-light-sub);
  padding-bottom: 12px;
  border-bottom: 2px solid var(--rs-primary);
  margin-bottom: 22px;
}
.rs-page-hero-title {
  font-size: var(--rs-text-h1);
  font-weight: 800;
  color: #fff;
  line-height: 1.15;
  margin-bottom: 18px;
}
.rs-page-hero-desc {
  font-size: 16px;
  line-height: 1.8;
  color: var(--rs-text-light-sub);
  max-width: 48rem;
}
</style>
