<template>
  <!-- 背景视频暂停/播放按钮：自动循环的动态内容须可暂停（WCAG 2.2.2）；位置由父级用 class 覆盖 -->
  <button
    v-if="video"
    type="button"
    class="hero-video-toggle"
    :aria-label="paused ? '播放背景视频' : '暂停背景视频'"
    @click="toggle"
  >
    <svg v-if="paused" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
    <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
  </button>
</template>

<script setup lang="ts">
// 头图、首页首屏背景视频共用：监听 video 的播放事件同步图标，不另存播放状态
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  /** 要控制的视频元素；为空（未渲染视频）时不显示按钮 */
  video?: HTMLVideoElement | null
}>()

const paused = ref(false)
const onPlay = () => { paused.value = false }
const onPause = () => { paused.value = true }

watch(() => props.video, (el, old) => {
  old?.removeEventListener('play', onPlay)
  old?.removeEventListener('pause', onPause)
  if (!el) return
  paused.value = el.paused
  el.addEventListener('play', onPlay)
  el.addEventListener('pause', onPause)
}, { immediate: true })

onBeforeUnmount(() => {
  props.video?.removeEventListener('play', onPlay)
  props.video?.removeEventListener('pause', onPause)
})

const toggle = () => {
  const el = props.video
  if (!el) return
  // 自动播放被拒时 play() 返回 rejected promise，停在首帧即可
  if (el.paused) el.play().catch(() => undefined)
  else el.pause()
}
</script>

<style scoped>
.hero-video-toggle {
  position: absolute;
  z-index: 5;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease, background 0.2s ease;
}
.hero-video-toggle:hover { opacity: 1; background: rgba(0, 0, 0, 0.6); }
.hero-video-toggle:focus-visible { outline: 2px solid #fff; outline-offset: 2px; opacity: 1; }
.hero-video-toggle svg { width: 16px; height: 16px; }
</style>
