<template>
  <!-- 图片/视频展示：信息图、架构图、产品截图按原比例完整展示，可点开看原图；有视频的条目播放视频；
       没传图也没传视频的条目以文字卡片呈现 -->
  <div class="ms" :class="{ 'ms--s2': style2, 'ms--dark': onDark }">
    <div v-if="visuals.length" class="ms-grid" :class="{ 'ms-grid--two': visuals.length > 1 }">
      <figure v-for="item in visuals" :key="item.id" class="ms-figure">
        <VideoPlayer
          v-if="item.video"
          :src="item.video"
          :poster="item.image"
          :title="item.title"
          :desc="item.desc"
          :on-dark="onDark"
        />
        <template v-else>
          <a v-if="isSafeUrl(item.image)" :href="item.image" target="_blank" rel="noopener noreferrer" class="ms-img-link" :aria-label="`查看大图：${item.title || heading}（在新窗口打开）`">
            <!-- 宽高只给占位比例（CSS 按原比例缩放），图片到达前不塌陷，避免版面跳动 -->
            <img :src="item.image" :alt="item.title || heading" class="ms-img" width="1200" height="675" loading="lazy" decoding="async" />
          </a>
          <figcaption v-if="item.title || item.desc" class="ms-caption">
            <strong v-if="item.title" class="ms-cap-title">{{ item.title }}</strong>
            <span v-if="item.desc" class="ms-cap-desc">{{ item.desc }}</span>
          </figcaption>
        </template>
      </figure>
    </div>

    <ul v-if="texts.length" class="ms-texts" :class="{ 'mt-8': visuals.length }">
      <li v-for="item in texts" :key="item.id" class="ms-text">
        <h3 class="ms-text-title">{{ item.title }}</h3>
        <p v-if="item.desc" class="ms-text-desc">{{ item.desc }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// media 区块：条目有图或视频即为「展示件」，其余为文字说明
import { computed } from 'vue'
import type { PageItem } from '@/api/page'
import VideoPlayer from './VideoPlayer.vue'

const props = defineProps<{
  items: PageItem[]
  /** 区块标题，图片未填标题时作替代文本 */
  heading: string
  onDark?: boolean
  style2?: boolean
}>()

/**
 * 图片地址可作链接：站内路径（/ 开头、非 //）或 http(s)。
 * 封面是后台录入的数据，javascript: 这类协议做成 href 就是注入口，不给链接
 */
const isSafeUrl = (url?: string): url is string =>
  !!url && ((url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url))

// 有图或视频的条目单独成「展示件」，按原比例完整展示，不裁切（信息图被裁就看不全）；
// 图片地址不安全的条目不当展示件，避免渲染出一张坏图
const visuals = computed(() => props.items.filter(it => it.video || isSafeUrl(it.image)))
const texts = computed(() => props.items.filter(it => !it.video && !isSafeUrl(it.image) && it.title))
</script>

<style scoped>
.ms { --ms-accent: var(--color-brand-600); --ms-radius: var(--radius-lg); }
.ms--s2 { --ms-accent: var(--rs-primary); --ms-radius: 0; }
.ms-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
/* 两件及以上并排（框架图里「产品介绍」左右两张图）；窄屏回落单列 */
@media (min-width: 768px) {
  .ms-grid--two { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
}
.ms-figure { margin: 0; }
.ms-img-link {
  display: block;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--ms-radius);
}
.ms-img-link:focus-visible { outline: 2px solid var(--ms-accent); outline-offset: 2px; }
.ms-img { display: block; width: 100%; height: auto; }
.ms-caption { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
.ms-cap-title { font-size: 15px; font-weight: 600; color: var(--color-ink-900); }
.ms-cap-desc { font-size: 14px; line-height: 1.7; color: var(--color-ink-500); }
.ms--dark .ms-cap-title { color: #fff; }
.ms--dark .ms-cap-desc { color: rgba(226, 232, 240, 0.85); }
/* 文字说明卡：左侧强调色竖条 */
.ms-texts { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; margin: 0; padding: 0; list-style: none; }
@media (min-width: 768px) { .ms-texts { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); } }
.ms-text {
  padding: 20px 24px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-left: 3px solid var(--ms-accent);
  border-radius: var(--ms-radius);
}
.ms-text-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.6; color: var(--color-ink-900); }
.ms-text-desc { margin: 8px 0 0; font-size: 14px; line-height: 1.8; color: var(--color-ink-500); }
</style>
