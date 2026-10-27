<template>
  <!-- 品牌介绍：每个品牌一张卡（图 + 名称 + 口号 + 简介），有品牌故事正文时卡上出「品牌故事」按钮，点开弹窗阅读 -->
  <div
    class="bs"
    :class="{ 'bs--s2': style2, 'bs--one': items.length === 1 && !cols, 'bs--fixed': cols }"
    :style="cols ? { '--cols': cols } : undefined"
  >
    <article v-for="item in items" :key="item.id" class="bs-card">
      <div v-if="item.image || item.video" class="bs-media">
        <SafeMedia :image="item.image" :video="item.video" :alt="item.title" :width="480" :height="360" fit="contain" class="bs-img" />
      </div>
      <div class="bs-body">
        <h3 class="bs-name">{{ item.title }}</h3>
        <p v-if="item.subtitle" class="bs-slogan">{{ item.subtitle }}</p>
        <p v-if="item.desc && item.desc !== item.subtitle" class="bs-desc">{{ item.desc }}</p>
        <button v-if="item.html" type="button" class="bs-btn" :aria-label="`${item.title}品牌故事`" @click="open(item)">
          品牌故事
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </article>

    <Teleport to="body">
      <Transition name="bs-fade">
        <div v-if="active" class="bs-mask" :class="{ 'bs--s2': style2 }" @mousedown.self="close">
          <div ref="dialogRef" class="bs-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
            <button type="button" class="bs-close" aria-label="关闭品牌故事" @click="close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <!-- 弹窗里有视频给完整播放控件，否则展示品牌图 -->
            <VideoPlayer v-if="active.video" :src="active.video" :poster="active.image" class="bs-dialog-video" />
            <img v-else-if="active.image" :src="active.image" :alt="active.title" class="bs-dialog-img" width="640" height="280" decoding="async" />
            <h2 :id="titleId" class="bs-dialog-title">{{ active.title }}</h2>
            <p v-if="active.subtitle" class="bs-slogan">{{ active.subtitle }}</p>
            <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化，见 storyHtml -->
            <div class="rich-html bs-story" v-html="storyHtml"></div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// brand 区块：品牌卡 + 品牌故事弹窗（框架图「千牛卫 / 小马哥 / 小鹿爱家」的品牌故事），两套模板共用
import { computed, ref, useId } from 'vue'
import type { PageItem } from '@/api/page'
import { sanitizeRichText } from '@/utils/sanitize'
import { useFocusTrap } from '@/composables/useFocusTrap'
import SafeMedia from '@/components/common/SafeMedia.vue'
import VideoPlayer from './VideoPlayer.vue'

defineProps<{
  items: PageItem[]
  style2?: boolean
  /** 电脑端每行列数，后台「区块外观」配置；缺省一行两张，只有一个品牌时横排大卡 */
  cols?: number
}>()

// 弹窗状态：当前打开的品牌；焦点管理与滚动锁定交给 useFocusTrap
const active = ref<PageItem | null>(null)
const dialogRef = ref<HTMLElement>()
const visible = computed(() => !!active.value)
const titleId = `brand-story-${useId()}`

const open = (item: PageItem) => { active.value = item }
const close = () => { active.value = null }
useFocusTrap(visible, dialogRef, close)

/** 品牌故事正文渲染前净化，v-html 不接未净化内容 */
const storyHtml = computed(() => sanitizeRichText(active.value?.html ?? ''))
</script>

<style scoped>
.bs { --bs-accent: var(--color-brand-600); --bs-radius: var(--radius-lg); display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
.bs--s2 { --bs-accent: var(--rs-primary); --bs-radius: 0; }
@media (min-width: 768px) { .bs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .bs--fixed { grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); } }
/* 只有一个品牌（未来人居的小鹿爱家）：图文左右排，不留半边空白 */
@media (min-width: 768px) {
  .bs--one { grid-template-columns: minmax(0, 1fr); }
  .bs--one .bs-card { flex-direction: row; align-items: center; }
  .bs--one .bs-media { flex: 0 0 45%; }
}
.bs-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--bs-radius);
}
.bs-media { background: var(--color-surface); }
.bs-media .bs-img { display: block; width: 100%; height: auto; max-height: 360px; object-fit: contain; }
.bs-body { padding: 24px 28px 28px; }
.bs-name { margin: 0; font-size: var(--text-fs-h3); font-weight: 700; color: var(--color-ink-900); }
.bs-slogan { margin: 8px 0 0; font-size: 15px; font-weight: 600; color: var(--bs-accent); }
.bs-desc { margin: 12px 0 0; font-size: 14px; line-height: 1.8; color: var(--color-ink-500); }
.bs-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  margin-top: 16px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--bs-accent);
  background: none;
  border: 1px solid var(--bs-accent);
  border-radius: var(--bs-radius);
  cursor: pointer;
}
.bs-btn:hover { color: #fff; background: var(--bs-accent); }
.bs-btn:focus-visible { outline: 2px solid var(--bs-accent); outline-offset: 2px; }
.bs-mask {
  --bs-accent: var(--color-brand-600);
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}
.bs-mask.bs--s2 { --bs-accent: var(--rs-primary); }
.bs-dialog {
  position: relative;
  width: 100%;
  max-width: 720px;
  max-height: calc(100svh - 32px);
  overflow-y: auto;
  padding: 32px;
  background: #fff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-3);
}
.bs--s2 .bs-dialog { border-radius: 0; }
.bs-dialog:focus { outline: none; }
.bs-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-500);
  background: none;
  border: 0;
  cursor: pointer;
}
.bs-close:hover, .bs-close:focus-visible { color: var(--bs-accent); }
.bs-dialog-video { margin-bottom: 20px; }
.bs-dialog-img { display: block; width: 100%; height: auto; max-height: 280px; margin-bottom: 20px; object-fit: contain; }
.bs-dialog-title { margin: 0 40px 0 0; font-size: var(--text-fs-h2, 28px); font-weight: 700; color: var(--color-ink-900); }
.bs-story { margin-top: 16px; font-size: var(--text-fs-body); line-height: 1.9; color: var(--color-ink-700); }
.bs-fade-enter-active, .bs-fade-leave-active { transition: opacity 0.2s; }
.bs-fade-enter-from, .bs-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .bs-fade-enter-active, .bs-fade-leave-active { transition: none; } }
</style>
