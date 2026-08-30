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

    <!-- rich：富文本段落块 -->
    <div v-else-if="block.layout === 'rich'" class="max-w-3xl mx-auto space-y-6">
      <div v-for="item in sorted" :key="item.id">
        <h3 class="text-base font-semibold mb-2" :class="onDark ? 'text-white' : 'text-gray-900'">{{ item.title }}</h3>
        <p v-if="item.desc" class="text-sm leading-loose" :class="onDark ? 'text-gray-200' : 'text-gray-500'">{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlock } from '@/api/page'
import SectionHeading from './SectionHeading.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps<{ block: PageBlock; onDark?: boolean }>()

// 按 sort 升序展示（与后台排序语义一致）
const sorted = computed(() => [...props.block.items].sort((a, b) => a.sort - b.sort))
</script>
