<template>
  <!-- 通用栏目页：按 key 拉取内容，渲染 Hero + 各内容块；按当前模板切换呈现 -->
  <div>
    <component
      :is="heroComp"
      v-if="content"
      :eyebrow="content.hero.eyebrow"
      :title="content.hero.title"
      :desc="content.hero.desc"
      :bg="content.hero.bg"
    />

    <!-- 加载态骨架 -->
    <div v-if="loading" class="max-w-7xl mx-auto px-6 lg:px-8 py-24">
      <div class="h-8 w-48 mx-auto bg-gray-100 rounded animate-pulse mb-10"></div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div v-for="i in 3" :key="i" class="h-36 bg-gray-100 rounded-2xl animate-pulse"></div>
      </div>
    </div>

    <!-- 内容块：奇偶交替底色，营造板块节奏；block.bg 配置背景图时覆盖底色并切换浅色文字 -->
    <template v-else-if="content">
      <section
        v-for="(block, i) in content.blocks"
        :key="block.anchor"
        class="relative bg-cover bg-center"
        :class="block.bg ? 'py-16 md:py-20' : sectionClass(i)"
        :style="block.bg ? { backgroundImage: `url('${block.bg}')` } : sectionStyle(i)"
      >
        <!-- 背景图深色蒙版 -->
        <div v-if="block.bg" class="absolute inset-0 bg-black/50 pointer-events-none"></div>
        <div class="relative" :class="theme.isStyle2 ? 'rs-channel-container' : 'max-w-7xl mx-auto px-6 lg:px-8'">
          <component :is="blockComp" :block="block" :on-dark="!!block.bg" />
        </div>
      </section>
    </template>

    <!-- 接口异常兜底 -->
    <div v-else class="max-w-7xl mx-auto px-6 lg:px-8 py-32">
      <EmptyState text="内容加载失败，请稍后重试" />
    </div>
  </div>
</template>

<script setup lang="ts">
// 数据驱动的栏目页容器：所有一级栏目页复用，仅传入 pageKey；按当前模板切换呈现层
import { ref, computed, watch, onMounted } from 'vue'
import { getPageContent } from '@/api/page'
import type { PageContent } from '@/api/page'
import { recordVisit } from '@/api/home'
import { useThemeStore } from '@/stores/theme'
import PageHero from './PageHero.vue'
import ContentBlock from './ContentBlock.vue'
import Style2PageHero from './Style2PageHero.vue'
import Style2ContentBlock from './Style2ContentBlock.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps<{ pageKey: string; visitLabel: string }>()

const theme = useThemeStore()
const heroComp = computed(() => (theme.isStyle2 ? Style2PageHero : PageHero))
const blockComp = computed(() => (theme.isStyle2 ? Style2ContentBlock : ContentBlock))

// 板块底色：样式一奇偶灰/白；样式二奇偶米色/白
function sectionClass(i: number) {
  if (theme.isStyle2) return 'rs-channel-section'
  return ['py-16 md:py-20', i % 2 === 1 ? 'bg-gray-50' : 'bg-white']
}
function sectionStyle(i: number) {
  if (!theme.isStyle2) return undefined
  return { background: i % 2 === 1 ? 'var(--rs-bg-cream)' : 'var(--rs-bg-white)' }
}

const content = ref<PageContent | null>(null)
const loading = ref(true)

// 拉取栏目内容；失败时 content 置空，由模板兜底
async function load(key: string) {
  loading.value = true
  content.value = null
  try {
    const res = await getPageContent(key)
    if (res.code === 0 && res.data) content.value = res.data
  } catch {
    content.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 访问埋点，失败静默忽略
  recordVisit(props.visitLabel).catch(() => {})
})

watch(() => props.pageKey, (key) => load(key), { immediate: true })
</script>

<style scoped>
.rs-channel-section {
  padding-top: var(--rs-section-py);
  padding-bottom: var(--rs-section-py);
}
.rs-channel-container {
  margin-left: auto;
  margin-right: auto;
  max-width: var(--rs-content-max);
  padding-left: var(--rs-content-px);
  padding-right: var(--rs-content-px);
}
</style>
