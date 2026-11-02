<template>
  <!-- 新版首页板块外壳：底色 + 容器 + 标题；样式一居中、样式二左对齐，由 style2 切换 -->
  <section :id="id" class="hb" :class="[style2 ? 'hb--s2' : 'hb--s1', `hb--${tone}`, { 'tone-dark': tone === 'dark' }]">
    <!-- 进入视口淡入上移：底色随 section 立即铺满，只有内容做入场，避免整块闪白 -->
    <div :ref="track('content')" class="hb-container fade-up" :class="{ visible: shown.has('content') }">
      <header v-if="eyebrow || title" class="hb-head">
        <div class="hb-head-text">
          <p v-if="eyebrow" class="hb-eyebrow">{{ eyebrow }}</p>
          <h2 v-if="title" class="hb-title">{{ title }}</h2>
        </div>
        <!-- 「查看全部」放在标题行右侧，不再单独占一行压在板块底部 -->
        <RouterLink v-if="moreTo" :to="moreTo" class="hb-more">{{ moreText || '查看全部' }}</RouterLink>
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
  /** 标题行右侧「查看全部」的跳转地址，不传不显示 */
  moreTo?: string
  moreText?: string
}>(), { tone: 'white' })
</script>

<style scoped>
/* 锚点偏移由全局 html 的 scroll-padding-top 统一补偿，这里不再叠加 */
.hb--s1 { padding: var(--section-py) 0; }
.hb--s2 { padding: var(--rs-section-py) 0; }
.hb-container { margin: 0 auto; min-width: 0; }
/* 首页板块比栏目页宽一档：1440 屏上两侧不再各空出两百多像素 */
.hb--s1 .hb-container { max-width: var(--home-container, 1320px); padding: 0 var(--gutter); }
.hb--s2 .hb-container { max-width: var(--rs-content-max); padding: 0 var(--rs-content-px); }

/* 底色全部走色板变量：深色站里白 / 浅灰自动是黑 / 深灰；dark 恒为纯黑
   --hb-card 是板块里卡片的底色，与板块底色错开：白底配浅灰卡、浅灰底配白卡、黑底配深灰卡，卡片边界始终可见 */
.hb { --hb-card: var(--color-elevated); }
.hb--white { --hb-card: var(--color-surface); }
.hb--dark { --hb-card: var(--color-elevated); }
.hb--white { background: var(--color-canvas); }
.hb--surface { background: var(--color-surface); }
.hb--dark { background: var(--color-navy-950); }

/* 标题：苹果式大字、紧行距；中文不加负字距（汉字会挤在一起） */
.hb-head { margin-bottom: var(--head-gap); }
/* 样式一：标题左对齐、「查看全部」靠右，打破每屏都是居中大标题的重复感 */
.hb--s1 .hb-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px 32px; }
.hb-head-text { min-width: 0; max-width: 760px; }
.hb-more {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: var(--text-fs-body);
  color: var(--color-brand-600);
  white-space: nowrap;
}
.hb-more::after { content: '›'; margin-left: 4px; font-size: 1.2em; line-height: 1; transition: transform var(--dur-fast); }
.hb-more:hover::after { transform: translateX(3px); }
.hb-more:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: 2px; }
.hb-eyebrow { margin: 0 0 12px; font-weight: 600; font-size: var(--text-fs-body); color: var(--color-ink-500); }
.hb-title { margin: 0; font-weight: 700; line-height: 1.15; font-size: var(--text-fs-h2); color: var(--color-ink-900); }
/* 苹果风格不用标题下的色条装饰，靠字号与留白区分层次 */
.hb-bar { display: none; }
</style>
