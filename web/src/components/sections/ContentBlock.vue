<template>
  <!-- 样式一内容块：按 layout 渲染 图文条目 / 条目列表 / 名称集合 / 序号步骤 / 富文本 / 视频；onDark 用于背景图区块 -->
  <section :id="block.anchor">
    <SectionHeading :heading="block.heading" :subheading="block.subheading" :on-dark="onDark" />
    <slot name="filter" />

    <slot v-if="!block.items.length" name="empty"><EmptyState :on-dark="onDark" /></slot>

    <!-- 图文条目：有图显示缩略图，无图显示序号；可点击时整卡为入口 -->
    <div v-else-if="block.layout === 'cards'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ItemLink v-for="item in block.items" :key="item.id" :item="item" link-class="cb-card-link" class="cb-card">
        <div v-if="item.image" class="cb-card-media">
          <SafeImage :src="item.image" :alt="item.title" :width="480" :height="300" />
        </div>
        <div class="cb-card-body">
          <div v-if="!item.image" class="cb-card-index tabular-nums">{{ String(item.sort).padStart(2, '0') }}</div>
          <div v-if="item.tag || item.date" class="flex items-center gap-3 mb-3 text-xs">
            <span v-if="item.tag" class="cb-tag">{{ item.tag }}</span>
            <time v-if="item.date" :datetime="item.date" class="text-ink-500 tabular-nums">{{ item.date }}</time>
          </div>
          <h3 class="cb-card-title">{{ item.title }}</h3>
          <p v-if="item.desc" class="cb-card-desc">{{ item.desc }}</p>
          <span v-if="item.hasDetail || item.link" class="cb-more" aria-hidden="true">
            {{ item.hasDetail ? '查看详情' : '访问链接' }}
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </span>
        </div>
      </ItemLink>
    </div>

    <!-- 条目列表：日期醒目居左（新闻类），标题与摘要居中，可点击时整行为入口 -->
    <div v-else-if="block.layout === 'list'" class="cb-list">
      <ItemLink v-for="item in block.items" :key="item.id" :item="item" link-class="cb-row-link" class="cb-row">
        <time v-if="item.date" :datetime="item.date" class="cb-row-date tabular-nums">
          <span class="cb-row-day">{{ item.date.slice(8, 10) }}</span>
          <span class="cb-row-month">{{ item.date.slice(0, 7) }}</span>
        </time>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1.5">
            <span v-if="item.tag" class="cb-tag">{{ item.tag }}</span>
            <h3 class="cb-row-title">{{ item.title }}</h3>
          </div>
          <p v-if="item.desc" class="cb-row-desc">{{ item.desc }}</p>
        </div>
        <svg v-if="item.hasDetail || item.link" class="cb-row-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </ItemLink>
    </div>

    <!-- 名称集合 -->
    <ul v-else-if="block.layout === 'tags'" class="flex flex-wrap justify-center gap-3">
      <li
        v-for="item in block.items"
        :key="item.id"
        class="px-5 py-2.5 rounded-md border text-sm"
        :class="onDark ? 'border-white/30 text-white bg-white/10' : 'border-line text-ink-700 bg-white'"
      >{{ item.title }}</li>
    </ul>

    <!-- 序号步骤 -->
    <ol v-else-if="block.layout === 'steps'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <li v-for="(item, i) in block.items" :key="item.id" class="flex items-start gap-4 p-6 rounded-lg border border-line bg-white">
        <span class="w-10 h-10 rounded-md bg-brand-600 text-white flex items-center justify-center text-sm font-bold shrink-0 tabular-nums" aria-hidden="true">
          {{ String(i + 1).padStart(2, '0') }}
        </span>
        <div>
          <h3 class="text-base font-semibold text-ink-900 mb-1.5">{{ item.title }}</h3>
          <p v-if="item.desc" class="text-ink-500 text-sm leading-relaxed">{{ item.desc }}</p>
        </div>
      </li>
    </ol>

    <!-- 视频：单条居中、多条两列 -->
    <div v-else-if="block.layout === 'video'" class="grid grid-cols-1 gap-8" :class="playable.length > 1 ? 'md:grid-cols-2' : 'max-w-3xl mx-auto'">
      <VideoPlayer
        v-for="item in playable"
        :key="item.id"
        :src="item.video as string"
        :poster="item.image"
        :title="item.title"
        :desc="item.desc"
        :on-dark="onDark"
      />
    </div>

    <!-- 富文本：正文有 HTML 时按富文本渲染，否则回落纯文本描述 -->
    <div v-else-if="block.layout === 'rich'" class="max-w-3xl mx-auto space-y-8">
      <div v-for="item in block.items" :key="item.id">
        <h3 class="text-lg font-semibold mb-3" :class="onDark ? 'text-white' : 'text-ink-900'">{{ item.title }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 richHtml -->
        <div v-if="item.html" class="rich-html text-[15px] leading-loose" :class="onDark ? 'text-slate-200' : 'text-ink-700'" v-html="richHtml(item.html)"></div>
        <p v-else-if="item.desc" class="text-[15px] leading-loose" :class="onDark ? 'text-slate-200' : 'text-ink-700'">{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 条目顺序以后端下发为准（置顶优先、再按后台排序），前端不再二次排序：
// 分页后二次排序只会在单页内打乱，与后台顺序对不上
import { computed } from 'vue'
import type { PageBlock } from '@/api/page'
import { sanitizeRichText } from '@/utils/sanitize'
import SafeImage from '@/components/common/SafeImage.vue'
import SectionHeading from './SectionHeading.vue'
import EmptyState from './EmptyState.vue'
import VideoPlayer from './VideoPlayer.vue'
import ItemLink from './ItemLink.vue'

const props = defineProps<{ block: PageBlock; onDark?: boolean }>()

// 视频区块只渲染真有视频地址的条目，没传视频的条目跳过而不是留个黑框
const playable = computed(() => props.block.items.filter(item => item.video))

/** 富文本渲染前净化，v-html 不接未净化内容 */
const richHtml = (html: string) => sanitizeRichText(html)
</script>

<style scoped src="./content-block.css"></style>
