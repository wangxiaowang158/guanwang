<template>
  <!-- 通用内容块：按 layout 渲染 cards/list/tags/steps/rich 五种形态；onDark 用于背景图板块 -->
  <section :id="block.anchor" class="scroll-mt-20">
    <SectionHeading :heading="block.heading" :subheading="block.subheading" :on-dark="onDark" />

    <EmptyState v-if="!sorted.length" />

    <!-- cards：图标卡片网格 -->
    <div v-else-if="block.layout === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <article
        v-for="item in sorted"
        :key="item.id"
        class="p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-200"
      >
        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-sm font-semibold text-gray-900 mb-2">{{ item.title }}</h3>
        <p v-if="item.desc" class="text-gray-400 text-sm leading-relaxed">{{ item.desc }}</p>
      </article>
    </div>

    <!-- list：左标记的横向列表，可带标签/日期 -->
    <div v-else-if="block.layout === 'list'" class="space-y-3">
      <article
        v-for="item in sorted"
        :key="item.id"
        class="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div class="w-1.5 self-stretch rounded-full bg-blue-500 shrink-0"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span v-if="item.tag" class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">{{ item.tag }}</span>
            <h3 class="text-sm font-semibold text-gray-900">{{ item.title }}</h3>
          </div>
          <p v-if="item.desc" class="text-gray-400 text-sm leading-relaxed">{{ item.desc }}</p>
        </div>
        <span v-if="item.date" class="text-xs text-gray-300 shrink-0 whitespace-nowrap">{{ item.date }}</span>
      </article>
    </div>
    <!-- tags：标签云 -->
    <div v-else-if="block.layout === 'tags'" class="flex flex-wrap justify-center gap-3">
      <span
        v-for="item in sorted"
        :key="item.id"
        class="px-5 py-2.5 rounded-full border text-sm transition-colors"
        :class="onDark
          ? 'border-white/30 text-white bg-white/10 hover:bg-white/20'
          : 'border-gray-200 text-gray-700 bg-white hover:border-blue-300 hover:text-blue-600'"
      >{{ item.title }}</span>
    </div>

    <!-- steps：带序号的纵向流程 -->
    <ol v-else-if="block.layout === 'steps'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <li
        v-for="(item, i) in sorted"
        :key="item.id"
        class="flex items-start gap-4 p-6 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
          {{ i + 1 }}
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900 mb-1.5">{{ item.title }}</h3>
          <p v-if="item.desc" class="text-gray-400 text-sm leading-relaxed">{{ item.desc }}</p>
        </div>
      </li>
    </ol>

    <!-- video：视频板块，单条占满、多条两列 -->
    <div
      v-else-if="block.layout === 'video'"
      class="grid grid-cols-1 gap-8"
      :class="playable.length > 1 ? 'md:grid-cols-2' : 'max-w-3xl mx-auto'"
    >
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

    <!-- rich：富文本段落块，正文有 HTML 时按富文本渲染，否则回落纯文本描述 -->
    <div v-else-if="block.layout === 'rich'" class="max-w-3xl mx-auto space-y-6">
      <div v-for="item in sorted" :key="item.id">
        <h3 class="text-base font-semibold mb-2" :class="onDark ? 'text-white' : 'text-gray-900'">{{ item.title }}</h3>
        <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 richHtml -->
        <div
          v-if="item.html"
          class="rich-html text-sm leading-loose"
          :class="onDark ? 'text-gray-200' : 'text-gray-500'"
          v-html="richHtml(item.html)"
        ></div>
        <p v-else-if="item.desc" class="text-sm leading-loose" :class="onDark ? 'text-gray-200' : 'text-gray-500'">{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlock } from '@/api/page'
import { sanitizeRichText } from '@/utils/sanitize'
import SectionHeading from './SectionHeading.vue'
import EmptyState from './EmptyState.vue'
import VideoPlayer from './VideoPlayer.vue'

const props = defineProps<{ block: PageBlock; onDark?: boolean }>()

// 按 sort 升序展示（与后台排序语义一致）
const sorted = computed(() => [...props.block.items].sort((a, b) => a.sort - b.sort))

// 视频板块只渲染真有视频地址的条目，没传视频的条目跳过而不是留个黑框
const playable = computed(() => sorted.value.filter(item => item.video))

/** 富文本渲染前净化，v-html 不接未净化内容 */
const richHtml = (html: string) => sanitizeRichText(html)
</script>

<style scoped>
/* v-html 产出的节点不带 scoped 标记，必须用 :deep 才能命中 */
.rich-html :deep(p) {
  margin-bottom: 1em;
}

.rich-html :deep(p:last-child) {
  margin-bottom: 0;
}

.rich-html :deep(h2),
.rich-html :deep(h3) {
  font-weight: 600;
  color: inherit;
  margin: 1.4em 0 0.6em;
}

.rich-html :deep(h2) {
  font-size: 1.1rem;
}

.rich-html :deep(h3) {
  font-size: 1rem;
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
  border-left: 3px solid #dbeafe;
}

.rich-html :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}

.rich-html :deep(img),
.rich-html :deep(video) {
  max-width: 100%;
  display: block;
  margin: 1.2em 0;
  border-radius: 10px;
}

.rich-html :deep(video) {
  width: 100%;
  background: #000;
}
</style>
