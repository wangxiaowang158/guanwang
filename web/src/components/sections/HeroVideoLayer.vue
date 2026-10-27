<template>
  <!-- 栏目页头图背景视频层：铺满父容器、静音循环；窄屏、减少动效或加载失败时不渲染，回落背景图 -->
  <video
    v-if="src && !blocked"
    ref="videoRef"
    class="hero-video"
    :src="src"
    :poster="poster"
    autoplay
    muted
    loop
    playsinline
    preload="metadata"
    aria-hidden="true"
    tabindex="-1"
    @error="markFailed"
  ></video>
  <HeroVideoToggle :video="videoRef" />
</template>

<script setup lang="ts">
// 头图背景视频，纯装饰：不进读屏、不可聚焦；播放策略与首页首屏视频一致（见 useHeroVideo）
import { ref } from 'vue'
import { useHeroVideo } from '@/composables/useHeroVideo'
import HeroVideoToggle from '@/components/common/HeroVideoToggle.vue'

defineProps<{
  /** 视频地址（后台「栏目管理」上传），为空不渲染 */
  src?: string
  /** 首帧，取头图背景图 */
  poster?: string
}>()

// 手机端与要求减少动效的用户不播；视频源坏了也回落背景图
const { blocked, markFailed } = useHeroVideo()
// 视频卸载（窄屏、失败）时 ref 置空，暂停按钮随之隐藏
const videoRef = ref<HTMLVideoElement | null>(null)
</script>

<style scoped>
/* 铺满头图并居中裁切，叠在背景图之上、遮罩之下（遮罩在 DOM 中位于其后） */
.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
</style>
