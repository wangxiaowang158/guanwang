<template>
  <!-- 视频播放器：封面图作 poster，点击后才加载视频本体 -->
  <figure class="video-player">
    <video
      class="video-el"
      :src="src"
      :poster="poster"
      controls
      preload="metadata"
      playsinline
      :aria-label="title || '视频'"
    >
      <!-- 浏览器不支持 video 时给出可下载的退路，不留空白 -->
      <a :href="src">下载视频</a>
    </video>
    <figcaption v-if="title || desc" class="video-caption" :class="{ 'is-ondark': onDark }">
      <h3 v-if="title" class="video-title">{{ title }}</h3>
      <p v-if="desc" class="video-desc">{{ desc }}</p>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
// 栏目页视频条目：受控播放，不自动播放
// preload 只取元数据，避免一进页面就下载整段视频拖慢首屏
defineProps<{
  src: string
  poster?: string
  title?: string
  desc?: string
  /** 深色背景板块上切换文字配色 */
  onDark?: boolean
}>()
</script>

<style scoped>
.video-player {
  margin: 0;
}

.video-el {
  width: 100%;
  display: block;
  /* 固定 16:9 占位，避免视频元数据到达前的高度跳动 */
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 12px;
  object-fit: contain;
}

.video-caption {
  margin-top: 14px;
}

.video-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.video-desc {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: #9ca3af;
}

/* 背景图板块上底色变深，说明文字需提亮才够对比度 */
.video-caption.is-ondark .video-title {
  color: #fff;
}

.video-caption.is-ondark .video-desc {
  color: rgba(255, 255, 255, 0.85);
}
</style>
