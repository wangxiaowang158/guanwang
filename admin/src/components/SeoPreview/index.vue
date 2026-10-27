<template>
  <!-- 搜索结果与分享卡片预览：边填边看，超长部分标红并说明会被截断 -->
  <div class="seo-preview">
    <div class="sp-head">
      <span class="sp-label">效果预览</span>
      <a-segmented v-model:value="mode" size="small" :options="MODES" />
    </div>

    <!-- 搜索结果：按百度 PC 端的显示宽度截断（中文约 30 字标题、80 字摘要） -->
    <div v-if="mode === 'search'" class="sp-serp">
      <div class="sp-serp-title">
        {{ titleFit.text }}<span v-if="titleFit.cut" class="sp-cut">…</span>
      </div>
      <div class="sp-serp-url">{{ displayUrl }}</div>
      <div class="sp-serp-desc">
        {{ descFit.text || '（未填写摘要，搜索引擎会自行从页面里截取一段文字）' }}<span v-if="descFit.cut" class="sp-cut">…</span>
      </div>
    </div>

    <!-- 分享卡片：微信聊天里的链接卡片，图片按正方形居中裁切 -->
    <div v-else class="sp-card">
      <div class="sp-card-text">
        <div class="sp-card-title">{{ title || '（未填写标题）' }}</div>
        <div class="sp-card-desc">{{ description || '（未填写摘要）' }}</div>
      </div>
      <div class="sp-card-thumb" :class="{ 'is-empty': !image }">
        <img v-if="image" :src="image" alt="" />
        <span v-else>无图</span>
      </div>
    </div>

    <ul v-if="warnings.length" class="sp-warn">
      <li v-for="w in warnings" :key="w">{{ w }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// 纯展示组件：不发请求，按传入的标题/摘要/图片即时渲染；截断规则是近似值，提示「大概率会被截」
import { computed, ref } from 'vue'
import { fitByWidth, textWidth, SERP_TITLE_WIDTH, SERP_DESC_WIDTH } from './measure'

defineOptions({ name: 'SeoPreview' })

const props = defineProps<{
  title?: string
  description?: string
  /** 分享卡片图；为空时卡片显示「无图」 */
  image?: string
  /** 页面地址（含域名），没有域名时只显示路径 */
  url?: string
}>()

const MODES = [
  { label: '搜索结果', value: 'search' },
  { label: '微信分享', value: 'share' },
]
const mode = ref<'search' | 'share'>('search')

const title = computed(() => (props.title || '').trim())
const description = computed(() => (props.description || '').trim())

const titleFit = computed(() => fitByWidth(title.value || '（未填写标题）', SERP_TITLE_WIDTH))
const descFit = computed(() => fitByWidth(description.value, SERP_DESC_WIDTH))

const displayUrl = computed(() => (props.url || '').replace(/^https?:\/\//, '') || '你的网站域名')

/** 给运营的具体提示：超了多少、缺了什么 */
const warnings = computed(() => {
  const list: string[] = []
  if (!title.value) list.push('还没填标题，搜索结果会显示网站名称')
  else if (titleFit.value.cut) list.push(`标题偏长，搜索结果里约在第 ${Math.floor(SERP_TITLE_WIDTH / 2)} 个字处被截断，重要的词往前放`)
  if (!description.value) list.push('还没填摘要，搜索引擎会自己截一段，往往是导航或页脚文字')
  else if (descFit.value.cut) list.push(`摘要偏长（约 ${Math.ceil(textWidth(description.value) / 2)} 字），超出部分不会显示`)
  else if (textWidth(description.value) < 60) list.push('摘要偏短，建议写到 40～80 字，把业务和优势说清楚')
  return list
})
</script>

<style scoped>
.seo-preview { padding: 12px 14px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; }
.sp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sp-label { font-size: 12px; color: #8c8c8c; }
/* 搜索结果：配色仿百度，帮运营建立直观印象 */
.sp-serp { max-width: 560px; font-family: Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
.sp-serp-title { font-size: 18px; line-height: 1.5; color: #2440b3; text-decoration: underline; }
.sp-serp-url { margin: 2px 0 4px; font-size: 13px; color: #626675; }
.sp-serp-desc { font-size: 13px; line-height: 1.7; color: #333; }
.sp-cut { color: #ff4d4f; font-weight: 600; }
/* 微信分享卡片：左文右图，图为正方形居中裁切 */
.sp-card { display: flex; gap: 12px; max-width: 320px; padding: 12px; background: #fff; border-radius: 6px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }
.sp-card-text { flex: 1; min-width: 0; }
.sp-card-title { font-size: 15px; line-height: 1.4; color: #000; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sp-card-desc { margin-top: 4px; font-size: 12px; line-height: 1.5; color: #888; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sp-card-thumb { flex-shrink: 0; width: 56px; height: 56px; overflow: hidden; border-radius: 2px; background: #f0f0f0; }
.sp-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
.sp-card-thumb.is-empty { display: flex; align-items: center; justify-content: center; font-size: 12px; color: #bfbfbf; }
.sp-warn { margin: 10px 0 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #d46b08; }
</style>
