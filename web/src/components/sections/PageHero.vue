<template>
  <!-- 样式一栏目页头图：左对齐标题区 + 当前位置导航；配背景图时叠深色遮罩，未配时为品牌深色底 -->
  <section class="page-hero" :style="bg ? { backgroundImage: `url('${bg}')` } : undefined" :class="{ 'page-hero--img': bg }">
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
    </div>
  </section>
</template>

<script setup lang="ts">
// 栏目页顶部视觉区，纯展示组件；bg 为背景图地址（来自 Banner 管理），为空时用品牌深色底
defineProps<{
  eyebrow: string
  title: string
  desc: string
  bg?: string
  /** 当前位置末级显示的栏目名，缺省时用主标题 */
  crumb?: string
}>()
</script>

<style scoped>
.page-hero {
  position: relative;
  overflow: hidden;
  padding: calc(var(--nav-h) + 56px) 0 64px;
  background-color: var(--color-navy-950);
  background-size: cover;
  background-position: center;
}
/* 无图：品牌深色 + 细网格；有图：左深右浅的遮罩，保证左侧文字可读 */
.page-hero-overlay {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 63px, rgba(148, 163, 184, 0.06) 64px),
    repeating-linear-gradient(90deg, transparent, transparent 63px, rgba(148, 163, 184, 0.06) 64px),
    radial-gradient(circle at 85% 20%, rgba(0, 184, 217, 0.18), transparent 45%);
}
.page-hero--img .page-hero-overlay {
  background: linear-gradient(90deg, rgba(7, 26, 54, 0.9) 0%, rgba(7, 26, 54, 0.65) 55%, rgba(7, 26, 54, 0.35) 100%);
}
.page-hero-crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 28px;
  font-size: 13px;
  color: rgba(226, 232, 240, 0.7);
}
.page-hero-crumb a { transition: color var(--dur-fast); }
.page-hero-crumb a:hover { color: #fff; }
.page-hero-crumb [aria-current] { color: #fff; }
.page-hero-eyebrow {
  margin: 0 0 12px;
  font-size: var(--text-fs-xs);
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--color-accent);
}
.page-hero-title {
  margin: 0;
  font-size: var(--text-fs-h1);
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}
.page-hero-desc {
  margin: 16px 0 0;
  max-width: 720px;
  font-size: var(--text-fs-body-lg);
  line-height: 1.8;
  color: rgba(226, 232, 240, 0.85);
}
</style>
