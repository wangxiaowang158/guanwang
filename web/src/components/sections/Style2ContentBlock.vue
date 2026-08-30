<template>
  <!-- 样式二内容块：按 layout 渲染 cards/list/tags/steps/rich，集团红风格；onDark 用于背景图板块 -->
  <section :id="block.anchor" class="scroll-mt-20" :class="{ 'rs-block--ondark': onDark }">
    <p class="rs-block-eyebrow">{{ block.heading }}</p>
    <h2 v-if="block.subheading" class="rs-block-sub">{{ block.subheading }}</h2>
    <div class="rs-block-bar"></div>

    <EmptyState v-if="!sorted.length" />

    <!-- cards：编号卡片网格 -->
    <div v-else-if="block.layout === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style="background: var(--rs-border)">
      <article v-for="(item, i) in sorted" :key="item.id" class="rs-card">
        <span class="rs-card-index">{{ String(i + 1).padStart(2, '0') }}</span>
        <h3 class="rs-card-title">{{ item.title }}</h3>
        <p v-if="item.desc" class="rs-card-desc">{{ item.desc }}</p>
      </article>
    </div>

    <!-- list：左红条横向列表 -->
    <div v-else-if="block.layout === 'list'" class="divide-y" style="border-color: var(--rs-border)">
      <article v-for="item in sorted" :key="item.id" class="flex items-start gap-5 py-6 first:pt-0">
        <div class="w-1 self-stretch shrink-0" style="background: var(--rs-primary)"></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 flex-wrap mb-1.5">
            <span v-if="item.tag" class="px-2.5 py-0.5 text-xs font-medium text-white" style="background: var(--rs-primary)">{{ item.tag }}</span>
            <h3 class="text-base font-bold" style="color: var(--rs-text-dark)">{{ item.title }}</h3>
          </div>
          <p v-if="item.desc" class="text-sm leading-relaxed" style="color: var(--rs-text-muted)">{{ item.desc }}</p>
        </div>
        <span v-if="item.date" class="text-xs shrink-0 whitespace-nowrap" style="color: var(--rs-text-muted)">{{ item.date }}</span>
      </article>
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

    <!-- rich：富文本段落块 -->
    <div v-else-if="block.layout === 'rich'" class="max-w-3xl space-y-7">
      <div v-for="item in sorted" :key="item.id">
        <h3 class="rs-rich-title text-lg font-bold mb-3">{{ item.title }}</h3>
        <p v-if="item.desc" class="rs-rich-text text-base leading-loose">{{ item.desc }}</p>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
// 样式二内容块：与样式一同数据结构，仅呈现层不同
import { computed } from 'vue'
import type { PageBlock } from '@/api/page'
import EmptyState from './EmptyState.vue'

const props = defineProps<{ block: PageBlock; onDark?: boolean }>()

// 按 sort 升序展示（与后台排序语义一致）
const sorted = computed(() => [...props.block.items].sort((a, b) => a.sort - b.sort))
</script>

<style scoped>
.rs-block-eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--rs-primary);
  margin-bottom: 10px;
}
.rs-block-sub {
  font-size: var(--rs-text-h2);
  font-weight: 700;
  color: var(--rs-text-dark);
  line-height: 1.3;
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
.rs-card:hover {
  background: var(--rs-bg-cream);
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
  line-height: 1.6;
  color: var(--rs-text-muted);
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

/* 背景图板块：标题与富文本切换浅色，卡片/列表保持白底悬浮于图上 */
.rs-block--ondark .rs-block-sub {
  color: #fff;
}
.rs-block--ondark .rs-rich-title {
  color: #fff;
}
.rs-block--ondark .rs-rich-text {
  color: rgba(255, 255, 255, 0.85);
}
</style>
