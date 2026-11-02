<template>
  <!-- 首屏底部数据条的单项：进入视口时数字递增到目标值 -->
  <div ref="elRef" class="hero-stat">
    <div class="hero-stat-value tabular-nums">{{ display }}<span>{{ suffix }}</span></div>
    <div class="hero-stat-label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
// 复用 useCountUp：原先首页自己写了一份 IntersectionObserver，每次重渲染都会重复注册
import { ref } from 'vue'
import { useCountUp } from '@/composables/useCountUp'

const props = defineProps<{ value: number; suffix: string; label: string }>()
const elRef = ref<HTMLElement>()
const { display } = useCountUp(elRef, props.value)
</script>

<style scoped>
.hero-stat { padding: 32px 0; }
/* 数字是首屏的第二视觉焦点：放大并加白到浅蓝的渐变 */
.hero-stat-value {
  font-size: clamp(36px, 4.4vw, 60px);
  background: linear-gradient(180deg, #fff 30%, #9ccfff);
  -webkit-background-clip: text;
  background-clip: text;
  font-weight: 700;
  color: transparent;
  line-height: 1.1;
  /* 数字是拉丁字形，收紧字距；单位与标签是中文，不收 */
  letter-spacing: -0.02em;
}
.hero-stat-value span {
  font-size: 0.5em;
  margin-left: 2px;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.72);
  -webkit-text-fill-color: rgba(255, 255, 255, 0.72);
}
.hero-stat-label {
  margin-top: 6px;
  font-size: var(--text-fs-sm);
  /* 首屏恒为深色遮罩：#a1a1a6 在黑底 8:1 */
  color: #a1a1a6;
}
</style>
