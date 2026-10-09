<template>
  <!-- 轻量轮播：自动播放（可暂停）、圆点、左右键、键盘方向键、触摸滑动；减少动态效果偏好下不自动播 -->
  <section
    class="cr"
    :class="{ 'cr--style2': style2 }"
    role="region"
    aria-roledescription="轮播"
    :aria-label="label"
    tabindex="0"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown.left.prevent="prev"
    @keydown.right.prevent="next"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div class="cr-viewport">
      <div class="cr-track" :style="{ transform: `translateX(-${index * 100}%)` }" :aria-live="playing ? 'off' : 'polite'">
        <!-- inert：非当前页的内容不可聚焦、不被读屏读到 -->
        <div
          v-for="(item, i) in items"
          :key="i"
          class="cr-slide"
          role="group"
          aria-roledescription="幻灯片"
          :aria-label="`第 ${i + 1} 张，共 ${items.length} 张`"
          :inert="i !== index"
        >
          <slot :item="item" :index="i" />
        </div>
      </div>
    </div>

    <template v-if="items.length > 1">
      <button type="button" class="cr-arrow cr-arrow--prev" aria-label="上一张" @click="prev">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button type="button" class="cr-arrow cr-arrow--next" aria-label="下一张" @click="next">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
      </button>

      <div class="cr-bar">
        <!-- 自动播放超过 5 秒须允许暂停（WCAG 2.2.2），减少动态效果时没有自动播放也就不显示 -->
        <button v-if="autoplayAllowed" type="button" class="cr-pause" :aria-label="userPaused ? '开始自动播放' : '暂停自动播放'" @click="userPaused = !userPaused">
          <svg v-if="userPaused" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
        </button>
        <div class="cr-dots">
          <button
            v-for="(_, i) in items"
            :key="i"
            type="button"
            class="cr-dot"
            :class="{ 'is-active': i === index }"
            :aria-label="`切换到第 ${i + 1} 张`"
            :aria-current="i === index ? 'true' : undefined"
            @click="goTo(i)"
          ></button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts" generic="T">
// 轻量轮播（不依赖第三方库）：内容通过默认插槽按条渲染，插槽参数 { item, index }
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  items: T[]
  /** 自动播放间隔（ms） */
  interval?: number
  /** 是否自动播放；用户偏好减少动态效果时无论如何都不自动播 */
  autoplay?: boolean
  /** 区域的可读名称，读屏用 */
  label?: string
  style2?: boolean
}>(), { interval: 6000, autoplay: true, label: '内容轮播' })

const index = ref(0)
const hovering = ref(false)
const focusing = ref(false)
const userPaused = ref(false)
const reducedMotion = ref(false)

let timer: ReturnType<typeof setInterval> | undefined
let motionQuery: MediaQueryList | undefined

const autoplayAllowed = computed(() => props.autoplay && !reducedMotion.value && props.items.length > 1)
// 悬停、键盘聚焦、用户暂停任一成立都停播，避免读到一半被切走
const playing = computed(() => autoplayAllowed.value && !userPaused.value && !hovering.value && !focusing.value)

const total = computed(() => props.items.length)

function goTo(i: number): void {
  if (!total.value) return
  index.value = ((i % total.value) + total.value) % total.value
}
const next = () => goTo(index.value + 1)
const prev = () => goTo(index.value - 1)

/**
 * 只有键盘焦点才暂停自动播放：鼠标/触屏点箭头或圆点也会让按钮获焦，
 * 若一并算作"聚焦"，点一次之后轮播就再也不会自动恢复
 */
function onFocusIn(e: FocusEvent): void {
  const el = e.target as HTMLElement | null
  if (el?.matches?.(':focus-visible')) focusing.value = true
}

/** 焦点移出整个轮播区才算失焦，区内切换焦点不应恢复播放 */
function onFocusOut(e: FocusEvent): void {
  const wrap = e.currentTarget as HTMLElement | null
  const to = e.relatedTarget as Node | null
  if (!wrap || !to || !wrap.contains(to)) focusing.value = false
}

// 触摸滑动：横向位移超过阈值且大于纵向位移才翻页，避免和页面纵向滚动冲突
const SWIPE_MIN_PX = 40
let startX = 0
let startY = 0
function onTouchStart(e: TouchEvent): void {
  startX = e.touches[0].clientX
  startY = e.touches[0].clientY
}
function onTouchEnd(e: TouchEvent): void {
  const dx = e.changedTouches[0].clientX - startX
  const dy = e.changedTouches[0].clientY - startY
  if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) next()
  else prev()
}

function stop(): void {
  if (timer) clearInterval(timer)
  timer = undefined
}

// 播放状态或间隔变化时重建计时器；翻页后计时重新开始，不会刚点完就被自动切走
watch([playing, () => props.interval, index], () => {
  stop()
  if (playing.value) timer = setInterval(next, props.interval)
})

// 条目减少时下标越界要回收
watch(total, () => goTo(index.value))

function onMotionChange(e: MediaQueryListEvent): void {
  reducedMotion.value = e.matches
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', onMotionChange)
  if (playing.value) timer = setInterval(next, props.interval)
})

onBeforeUnmount(() => {
  stop()
  motionQuery?.removeEventListener('change', onMotionChange)
})
</script>

<style scoped>
.cr { --cr-accent: var(--color-brand-600); --cr-radius: var(--radius-pill); position: relative; }
.cr--style2 { --cr-accent: var(--rs-primary); --cr-radius: 0; }
.cr-viewport { overflow: hidden; }
/* 宽屏下箭头悬浮在内容两侧：给视口留出箭头的位置（12 + 44 + 12），避免压住幻灯片文字 */
@media (min-width: 641px) {
  .cr-viewport { margin: 0 68px; }
}
.cr-track { display: flex; transition: transform var(--dur-slow) var(--ease-out); }
.cr-slide { flex: 0 0 100%; min-width: 0; }

.cr-arrow {
  position: absolute;
  top: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-700);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--color-line);
  border-radius: var(--cr-radius);
  transform: translateY(-50%);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}
.cr-arrow:hover,
.cr-arrow:focus-visible { color: var(--cr-accent); border-color: var(--cr-accent); }
.cr-arrow--prev { left: 12px; }
.cr-arrow--next { right: 12px; }

.cr-bar { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
.cr-pause {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-500);
  background: none;
  border: 1px solid var(--color-line);
  border-radius: var(--cr-radius);
  cursor: pointer;
}
.cr-pause:hover,
.cr-pause:focus-visible { color: var(--cr-accent); border-color: var(--cr-accent); }
.cr-dots { display: flex; align-items: center; gap: 4px; }
/* 点击热区 24px，视觉圆点用伪元素画，保证触屏易点 */
.cr-dot { position: relative; width: 24px; height: 24px; background: none; border: 0; cursor: pointer; }
.cr-dot::after {
  content: '';
  position: absolute;
  inset: 8px;
  background: var(--color-ink-400);
  border-radius: var(--cr-radius);
  transition: background var(--dur-fast);
}
.cr-dot.is-active::after { background: var(--cr-accent); }

@media (prefers-reduced-motion: reduce) {
  .cr-track { transition: none; }
}
@media (max-width: 640px) {
  /* 窄屏左右键遮挡内容，隐藏后靠触摸滑动与圆点切换 */
  .cr-arrow { display: none; }
}
</style>
