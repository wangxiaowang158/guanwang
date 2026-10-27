<template>
  <!-- 新版首页板块外壳：底色 + 容器 + 标题；样式一居中、样式二左对齐，由 style2 切换 -->
  <section :id="id" class="hb" :class="[style2 ? 'hb--s2' : 'hb--s1', `hb--${tone}`]">
    <!-- 进入视口淡入上移：底色随 section 立即铺满，只有内容做入场，避免整块闪白 -->
    <div :ref="track('content')" class="hb-container fade-up" :class="{ visible: shown.has('content') }">
      <header v-if="eyebrow || title" class="hb-head">
        <p v-if="eyebrow" class="hb-eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="hb-title">{{ title }}</h2>
        <span class="hb-bar" aria-hidden="true"></span>
      </header>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
// 板块外壳，纯展示；tone 决定底色，dark 时标题自动切浅色
import { useReveal } from '@/composables/useReveal'

// 板块顶端进入视口（底边内缩 8%）即入场，与板块多高无关
const { shown, track } = useReveal()

withDefaults(defineProps<{
  id?: string
  eyebrow?: string
  title?: string
  style2?: boolean
  tone?: 'white' | 'surface' | 'dark'
}>(), { tone: 'white' })
</script>

<style scoped>
/* 锚点偏移由全局 html 的 scroll-padding-top 统一补偿，这里不再叠加 */
.hb--s1 { padding: var(--section-py) 0; }
.hb--s2 { padding: var(--rs-section-py) 0; }
.hb-container { margin: 0 auto; min-width: 0; }
.hb--s1 .hb-container { max-width: var(--container); padding: 0 var(--gutter); }
.hb--s2 .hb-container { max-width: var(--rs-content-max); padding: 0 var(--rs-content-px); }

/* 底色：样式一白/浅灰/深蓝，样式二白/米色/深色
   --hb-card 是板块里卡片的底色，与板块底色错开：白底配浅色卡、浅色底配白卡、深色底配白卡，卡片边界始终可见 */
.hb { --hb-card: #fff; }
.hb--s1.hb--white { --hb-card: var(--color-surface); }
.hb--s2.hb--white { --hb-card: var(--rs-bg-cream); }
.hb--s1.hb--white { background: #fff; }
.hb--s1.hb--surface { background: var(--color-surface); }
.hb--s1.hb--dark { background: var(--color-navy-950); }
.hb--s2.hb--white { background: var(--rs-bg-white); }
.hb--s2.hb--surface { background: var(--rs-bg-cream); }
.hb--s2.hb--dark { background: var(--rs-bg-dark); }

.hb-head { margin-bottom: var(--head-gap); }
.hb--s1 .hb-head { text-align: center; }
.hb-eyebrow { margin: 0 0 12px; font-weight: 600; }
.hb--s1 .hb-eyebrow { font-size: var(--text-fs-xs); letter-spacing: 0.16em; color: var(--color-brand-600); }
.hb--s2 .hb-eyebrow { font-size: 13px; letter-spacing: 0.15em; color: var(--rs-primary); }
.hb-title { margin: 0; font-weight: 700; line-height: 1.3; }
.hb--s1 .hb-title { font-size: var(--text-fs-h2); color: var(--color-ink-900); }
.hb--s2 .hb-title { font-size: var(--rs-text-h2); color: var(--rs-text-dark); }
.hb-bar { display: block; width: 48px; height: 3px; margin-top: 18px; }
.hb--s1 .hb-bar { margin-left: auto; margin-right: auto; background: var(--color-brand-600); border-radius: 2px; }
.hb--s2 .hb-bar { background: var(--rs-primary); }

.hb--dark .hb-title { color: #fff; }
.hb--s2.hb--dark .hb-eyebrow { color: #fff; opacity: 0.75; }
.hb--s1.hb--dark .hb-eyebrow { color: var(--color-accent); }
</style>
