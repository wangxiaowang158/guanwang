<template>
  <!-- 样式二内容块：按 layout 渲染 cards/list/tags/steps/rich，集团红风格；onDark 用于背景图板块 -->
  <section v-if="renderable" :id="block.anchor" class="scroll-mt-20" :class="{ 'rs-block--ondark': onDark }">
    <!-- 区块名是这一段的标题，读屏与大纲都靠 h2；副标题是说明文字 -->
    <h2 class="rs-block-eyebrow">{{ block.heading }}</h2>
    <p v-if="block.subheading" class="rs-block-sub">{{ block.subheading }}</p>
    <div class="rs-block-bar"></div>

    <slot name="filter" />
    <slot v-if="!sorted.length" name="empty"><EmptyState :on-dark="onDark" /></slot>

    <!-- 结构化区块：数据汇总自条目 extra，标题已由上方统一渲染 -->
    <Style2PainPointList v-else-if="block.layout === 'pains'" :items="pains" :on-dark="onDark" />
    <Style2ProcessFlow v-else-if="block.layout === 'flow'" :items="steps" :on-dark="onDark" />
    <Style2MetricBoard v-else-if="block.layout === 'metrics'" :items="metrics" :on-dark="onDark" />
    <Style2CooperationModes v-else-if="block.layout === 'modes'" :items="modes" :on-dark="onDark" />
    <Style2ImageGallery v-else-if="block.layout === 'gallery'" :images="gallery" :on-dark="onDark" :alt-prefix="`${block.heading} `" />
    <!-- 证言：单条直接展示，多条轮播 -->
    <template v-else-if="block.layout === 'quote'">
      <Style2TestimonialQuote v-if="quotes.length === 1" :quote="quotes[0]" :on-dark="onDark" />
      <BaseCarousel v-else :items="quotes" :label="block.heading" style2>
        <template #default="{ item }"><Style2TestimonialQuote :quote="item" :on-dark="onDark" /></template>
      </BaseCarousel>
    </template>

    <!-- 图文条目：有图显示配图，无图显示编号；可点击时整卡为入口 -->
    <div v-else-if="block.layout === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style="background: var(--rs-border)">
      <ItemLink v-for="item in sorted" :key="item.id" :item="item" link-class="rs-card--link" class="rs-card block">
        <div v-if="item.image || fallbackImage" class="rs-card-media">
          <SafeImage :src="item.image" :fallback="fallbackImage" :alt="item.title" :width="480" :height="300" />
        </div>
        <span v-else class="rs-card-index">{{ String(item.sort).padStart(2, '0') }}</span>
        <div v-if="item.tag || item.date" class="flex items-center gap-3 mb-3 text-xs">
          <span v-if="item.tag" class="px-2.5 py-0.5 font-medium text-white" style="background: var(--rs-primary)">{{ item.tag }}</span>
          <time v-if="item.date" :datetime="item.date" class="tabular-nums" style="color: var(--rs-text-muted)">{{ item.date }}</time>
        </div>
        <!-- 业务线与行业标签：案例、产品、方案卡片按 extra 展示 -->
        <ul v-if="chipsOf(item).length" class="rs-chips" aria-label="业务线与行业">
          <li v-for="chip in chipsOf(item)" :key="chip" class="rs-chip">{{ chip }}</li>
        </ul>
        <h3 class="rs-card-title">{{ item.title }}</h3>
        <p v-if="item.desc" class="rs-card-desc">{{ item.desc }}</p>
      </ItemLink>
    </div>

    <!-- 条目列表：左红条 + 标题摘要 + 日期；可点击时整行为入口 -->
    <div v-else-if="block.layout === 'list'" class="divide-y" style="border-color: var(--rs-border)">
      <ItemLink v-for="item in sorted" :key="item.id" :item="item" link-class="rs-row--link" class="rs-row flex items-start gap-5 py-6 first:pt-0">
        <div class="w-1 self-stretch shrink-0" style="background: var(--rs-primary)"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 flex-wrap mb-1.5">
            <span v-if="item.tag" class="px-2.5 py-0.5 text-xs font-medium text-white" style="background: var(--rs-primary)">{{ item.tag }}</span>
            <h3 class="rs-row-title text-base font-bold">{{ item.title }}</h3>
          </div>
          <p v-if="item.desc" class="text-sm leading-relaxed" style="color: var(--rs-text-body)">{{ item.desc }}</p>
        </div>
        <time v-if="item.date" :datetime="item.date" class="text-xs shrink-0 whitespace-nowrap tabular-nums" style="color: var(--rs-text-muted)">{{ item.date }}</time>
      </ItemLink>
    </div>
    <!-- tags：标签云 -->
    <div v-else-if="block.layout === 'tags'" class="flex flex-wrap gap-3">
      <span
        v-for="item in sorted"
        :key="item.id"
        class="rs-tag"
      >{{ item.title }}</span>
    </div>

    <!-- steps：编号流程 -->
    <ol v-else-if="block.layout === 'steps'" class="grid grid-cols-1 md:grid-cols-2 gap-px" style="background: var(--rs-border)">
      <li v-for="(item, i) in sorted" :key="item.id" class="flex items-start gap-5 bg-white p-7">
        <div class="rs-step-num">{{ String(i + 1).padStart(2, '0') }}</div>
        <div>
          <h3 class="text-base font-bold mb-2" style="color: var(--rs-text-dark)">{{ item.title }}</h3>
          <p v-if="item.desc" class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ item.desc }}</p>
        </div>
      </li>
    </ol>

    <!-- video：视频板块，单条占满、多条两列 -->
    <div
      v-else-if="block.layout === 'video'"
      class="grid grid-cols-1 gap-8"
      :class="playable.length > 1 ? 'md:grid-cols-2' : 'max-w-3xl'"
    >
      <VideoPlayer
        v-for="item in playable"
        :key="item.id"
        :src="item.video as string"
        :poster="item.image || fallbackImage"
        :title="item.title"
        :desc="item.desc"
        :on-dark="onDark"
      />
    </div>

    <!-- rich：富文本段落块，正文有 HTML 时按富文本渲染，否则回落纯文本描述 -->
    <div v-else-if="block.layout === 'rich'" class="max-w-3xl space-y-7">
      <div v-for="item in sorted" :key="item.id">
        <h3 class="rs-rich-title text-lg font-bold mb-3">{{ item.title }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 richHtml -->
        <div
          v-if="item.html"
          class="rs-rich-text rich-html text-base leading-loose"
          v-html="richHtml(item.html)"
        ></div>
        <p v-else-if="item.desc" class="rs-rich-text text-base leading-loose">{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
// 样式二内容块：与样式一同数据结构，仅呈现层不同
import { computed } from 'vue'
import type { PageBlock } from '@/api/page'
import { sanitizeRichText } from '@/utils/sanitize'
import SafeImage from '@/components/common/SafeImage.vue'
import BaseCarousel from '@/components/common/BaseCarousel.vue'
import EmptyState from './EmptyState.vue'
import VideoPlayer from './VideoPlayer.vue'
import ItemLink from './ItemLink.vue'
import Style2PainPointList from './Style2PainPointList.vue'
import Style2ProcessFlow from './Style2ProcessFlow.vue'
import Style2MetricBoard from './Style2MetricBoard.vue'
import Style2CooperationModes from './Style2CooperationModes.vue'
import Style2TestimonialQuote from './Style2TestimonialQuote.vue'
import Style2ImageGallery from './Style2ImageGallery.vue'
import { blockHasContent, galleryOf, isExtraLayout, metricsOf, modesOf, painsOf, quotesOf, stepsOf } from './blockExtra'
import { chipsOf } from './itemChips'

const props = defineProps<{
  block: PageBlock
  onDark?: boolean
  /** 条目未配图时的缺省配图（按所在栏目主题），不传则无图条目显示编号 */
  fallbackImage?: string
}>()

// 顺序以后端下发为准（置顶优先、再按后台排序），前端不再二次排序：分页后会在单页内打乱
const sorted = computed(() => props.block.items)

// 视频板块只渲染真有视频地址的条目，没传视频的条目跳过而不是留个黑框
const playable = computed(() => sorted.value.filter(item => item.video))

// 结构化区块的汇总数据；无数据的结构化区块整块不渲染，普通区块仍走空态
const pains = computed(() => painsOf(props.block))
const steps = computed(() => stepsOf(props.block))
const metrics = computed(() => metricsOf(props.block))
const modes = computed(() => modesOf(props.block))
const quotes = computed(() => quotesOf(props.block))
const gallery = computed(() => galleryOf(props.block))
const renderable = computed(() => !isExtraLayout(props.block.layout) || blockHasContent(props.block))

/** 富文本渲染前净化，v-html 不接未净化内容 */
const richHtml = (html: string) => sanitizeRichText(html)
</script>

<style scoped>
.rs-block-eyebrow {
  font-size: var(--rs-text-h2);
  font-weight: 700;
  color: var(--rs-text-dark);
  line-height: 1.3;
  margin: 0;
}
.rs-block-sub {
  margin: 12px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--rs-text-body);
  max-width: 48rem;
}
.rs-block--ondark .rs-block-eyebrow {
  color: #fff;
}
.rs-block-bar {
  width: 48px;
  height: 3px;
  background: var(--rs-primary);
  margin: 18px 0 36px;
}
.rs-card {
  position: relative;
  background: #fff;
  padding: 32px 28px;
  transition: background 0.25s ease;
}
/* 只有可点击的条目给悬停反馈，不可点击的条目悬停变色会让人以为能点 */
.rs-card--link:hover {
  background: var(--rs-bg-cream);
}
.rs-card--link:hover .rs-card-title,
.rs-row--link:hover .rs-row-title {
  color: var(--rs-primary);
}
.rs-card-media {
  margin: -32px -28px 24px;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--rs-bg-cream);
}
.rs-row-title {
  color: var(--rs-text-dark);
  transition: color 0.2s ease;
}
/* 背景图区块上的列表：行底加白，避免深色文字压在图片上看不清 */
.rs-block--ondark .rs-row {
  background: #fff;
  padding-left: 20px;
  padding-right: 20px;
}
.rs-card-index {
  font-size: 24px;
  font-weight: 800;
  color: var(--rs-primary);
  opacity: 0.25;
}
.rs-card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--rs-text-dark);
  margin: 12px 0 8px;
}
.rs-card-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--rs-text-body);
}
/* 业务线 / 行业标签：描边小标，允许窄屏换行 */
.rs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.rs-chip {
  padding: 1px 8px;
  font-size: 12px;
  color: var(--rs-text-body);
  border: 1px solid var(--rs-border);
}
.rs-tag {
  padding: 10px 22px;
  border: 1px solid var(--rs-border);
  font-size: 14px;
  color: var(--rs-text-body);
  background: #fff;
  transition: all 0.2s ease;
}
.rs-tag:hover {
  border-color: var(--rs-primary);
  color: var(--rs-primary);
}
.rs-step-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--rs-primary);
  opacity: 0.4;
  flex-shrink: 0;
}

.rs-rich-title {
  color: var(--rs-text-dark);
}
.rs-rich-text {
  color: var(--rs-text-body);
}

/* v-html 产出的节点不带 scoped 标记，必须用 :deep 才能命中 */
.rich-html :deep(p) {
  margin-bottom: 1em;
}

.rich-html :deep(p:last-child) {
  margin-bottom: 0;
}

.rich-html :deep(h2),
.rich-html :deep(h3) {
  font-weight: 700;
  color: var(--rs-text-dark);
  margin: 1.4em 0 0.6em;
}

.rich-html :deep(h2) {
  font-size: 1.15rem;
}

.rich-html :deep(h3) {
  font-size: 1.05rem;
}

.rich-html :deep(ul),
.rich-html :deep(ol) {
  margin: 0 0 1em 1.4em;
}

.rich-html :deep(ul) {
  list-style: disc;
}

.rich-html :deep(ol) {
  list-style: decimal;
}

.rich-html :deep(li) {
  margin-bottom: 0.4em;
}

.rich-html :deep(blockquote) {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 3px solid var(--rs-primary);
}

.rich-html :deep(a) {
  color: var(--rs-primary);
  text-decoration: underline;
}

.rich-html :deep(img),
.rich-html :deep(video) {
  max-width: 100%;
  display: block;
  margin: 1.2em 0;
}

.rich-html :deep(video) {
  width: 100%;
  background: #000;
}

/* 背景图板块：标题与富文本切换浅色，卡片/列表保持白底悬浮于图上 */
.rs-block--ondark .rs-block-sub {
  color: rgba(255, 255, 255, 0.85);
}

/* 深色板块上富文本内的标题同样要提亮 */
.rs-block--ondark .rich-html :deep(h2),
.rs-block--ondark .rich-html :deep(h3) {
  color: #fff;
}
.rs-block--ondark .rs-rich-title {
  color: #fff;
}
.rs-block--ondark .rs-rich-text {
  color: rgba(255, 255, 255, 0.85);
}
</style>
