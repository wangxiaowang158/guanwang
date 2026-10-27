<template>
  <!-- 图片位通用媒体：配了视频就静音循环播放（封面作首帧），否则走 SafeImage；
       窄屏、减少动效时不自动播放：有封面显示封面，没封面（图集里的纯视频）停在视频首帧；视频源失效回落图片 -->
  <span v-if="playVideo" class="safe-media" :style="{ aspectRatio: `${width} / ${height}` }">
    <video
      ref="videoRef"
      class="safe-media-video"
      :class="{ 'is-contain': fit === 'contain' }"
      :src="video"
      :poster="poster"
      :width="width"
      :height="height"
      muted
      loop
      playsinline
      :preload="blocked ? 'metadata' : 'none'"
      :aria-label="alt || undefined"
      :aria-hidden="alt ? undefined : 'true'"
      tabindex="-1"
      @play="paused = false"
      @pause="paused = true"
      @error="failed = true"
    ></video>
    <!-- 自动播放的动态内容须可暂停（WCAG 2.2.2）；放在卡片链接里时点按钮不触发跳转 -->
    <button
      v-if="!blocked"
      type="button"
      class="safe-media-toggle"
      :aria-label="paused ? '播放视频' : '暂停视频'"
      @click.prevent.stop="toggle"
    >
      <svg v-if="paused" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
      <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
    </button>
  </span>
  <SafeImage v-else :src="image" :fallback="fallback" :alt="alt" :width="width" :height="height" :eager="eager" />
</template>

<script setup lang="ts">
// 卡片、磁贴、品牌、图集、首页图片位共用：后台在这些位置既可传图也可传视频
// 视频只在进入视口时播放、离开即暂停，避免一页十几段视频同时解码、白耗流量
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import SafeImage from './SafeImage.vue'
import { useHeroVideo } from '@/composables/useHeroVideo'

const props = withDefaults(defineProps<{
  /** 视频地址；为空时只显示图片 */
  video?: string
  /** 图片地址；有视频时作首帧 */
  image?: string
  alt?: string
  /** 宽高既是图片的固有尺寸，也是视频加载前的占位比例，避免版面跳动 */
  width: number
  height: number
  eager?: boolean
  fallback?: string
  /** 视频填充方式：cover 裁切铺满（默认），contain 完整显示（品牌图、信息图） */
  fit?: 'cover' | 'contain'
}>(), { fit: 'cover' })

// 播放策略与头图背景视频一致：手机端、减少动效不自动播
const { blocked } = useHeroVideo()
const poster = computed(() => props.image || props.fallback || undefined)
const failed = ref(false)
const playVideo = computed(() => !!props.video && !failed.value && (!blocked.value || !poster.value))

const videoRef = ref<HTMLVideoElement>()
/** 当前是否暂停，驱动按钮图标 */
const paused = ref(true)
/** 用户手动暂停过：之后滚动进出视口不再自动恢复播放 */
let userPaused = false
/** 是否在视口内 */
let inView = false
let observer: IntersectionObserver | null = null

// play() 在自动播放被拒时返回 rejected promise，吞掉即可：此时停在首帧
const tryPlay = (el: HTMLVideoElement) => { el.play().catch(() => undefined) }

/** 按当前状态决定播放或暂停：在视口内、未被阻止、用户没手动暂停才播 */
const sync = () => {
  const el = videoRef.value
  if (!el) return
  if (inView && !blocked.value && !userPaused) tryPlay(el)
  else el.pause()
}

const toggle = () => {
  const el = videoRef.value
  if (!el) return
  userPaused = !el.paused
  if (userPaused) el.pause()
  else tryPlay(el)
}

const stopObserve = () => {
  observer?.disconnect()
  observer = null
}

watch(videoRef, (el) => {
  stopObserve()
  inView = false
  if (!el || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    sync()
  }, { threshold: 0.25 })
  observer.observe(el)
})

// 播放途中开启减少动效或缩到窄屏：立即停下；恢复后视频仍在视口内则接着播，不用等滚出再滚回
watch(blocked, sync)

// 复用组件换了地址时重置失败态与手动暂停
watch(() => props.video, () => {
  failed.value = false
  userPaused = false
})

onBeforeUnmount(stopObserve)
</script>

<style scoped>
.safe-media {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.safe-media-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.safe-media-video.is-contain { object-fit: contain; }
.safe-media-toggle {
  /* 右上角：磁贴等卡片的标题压在底部，放下面会挡字；z-index 高于磁贴的渐变遮罩 */
  position: absolute;
  z-index: 2;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.85;
  transition: opacity var(--dur-base, 300ms);
}
.safe-media-toggle:hover { opacity: 1; }
.safe-media-toggle:focus-visible { outline: 2px solid var(--color-accent, #fff); outline-offset: 2px; opacity: 1; }
.safe-media-toggle svg { width: 16px; height: 16px; }
</style>
