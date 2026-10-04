<template>
  <!-- 条目外壳：按条目维护的内容决定点击行为（SRS 3.5.1 条目点击行为表）
       有正文 → 站内详情；仅有链接 → 新窗口打开；都没有 → 不可点击 -->
  <RouterLink v-if="item.hasDetail" :to="`/article/${item.id}`" :class="linkClass">
    <slot />
  </RouterLink>
  <a v-else-if="external" :href="external" target="_blank" rel="noopener noreferrer" :class="linkClass">
    <slot />
    <span class="sr-only">（在新窗口打开）</span>
  </a>
  <article v-else><slot /></article>
</template>

<script setup lang="ts">
// 栏目页条目的可点击外壳，两套模板共用；可点击时额外挂 linkClass（悬停态等）
import { computed } from 'vue'
import type { PageItem } from '@/api/page'
import { safeExternalUrl } from '@/utils/sanitize'

const props = defineProps<{ item: PageItem; linkClass?: string }>()

// 后端已只放行 http(s)，前端再兜一道：href 绑定不经 DOMPurify
const external = computed(() => safeExternalUrl(props.item.link))
</script>
