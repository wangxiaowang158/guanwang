<template>
  <!-- 页内锚点条：长页面吸顶在顶栏下方，滚动时高亮当前段落；点击平滑定位 -->
  <nav class="csn" :class="{ 'csn--s2': style2 }" aria-label="本页目录">
    <div class="csn-inner" :class="style2 ? 'rs-channel-container' : 'site-container'">
      <a
        v-for="item in items"
        :key="item.anchor"
        :href="`#${item.anchor}`"
        class="csn-link"
        :class="{ 'is-active': active === item.anchor }"
        :aria-current="active === item.anchor ? 'location' : undefined"
        @click.prevent="go(item.anchor)"
      >{{ item.label }}</a>
    </div>
  </nav>
</template>

<script setup lang="ts">
// 只在区块够多时由父级渲染（见 ChannelPage），高亮用 IntersectionObserver，不监听 scroll
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

export interface SubNavItem {
  anchor: string
  label: string
}

const props = defineProps<{ items: SubNavItem[]; style2?: boolean }>()

/** 吸顶条自身高度，与样式里的 height 一致；定位时与顶栏一起让出 */
const SUBNAV_H = 48

const router = useRouter()
const active = ref(props.items[0]?.anchor ?? '')
let observer: IntersectionObserver | null = null

/** 样式二顶栏固定 76px（Style2Header 的 h-[76px]），比全局 --nav-h 高 4px */
const STYLE2_NAV_H = 76

/** 顶栏高度：样式一取 CSS 变量 --nav-h，样式二用固定值 */
const navHeight = () => props.style2
  ? STYLE2_NAV_H
  : Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72

/** 平滑滚到段落并同步地址栏 hash（replace，不堆历史记录） */
const go = (anchor: string) => {
  const el = document.getElementById(anchor)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight() - SUBNAV_H - 8
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  active.value = anchor
  void router.replace({ hash: `#${anchor}` })
}

/** 观察各段落：进入视口上半部的那段即为当前段 */
const observe = () => {
  observer?.disconnect()
  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) active.value = hit.target.id
    },
    // 顶部让出顶栏与吸顶条，底部只取上半屏：段落顶端越过屏幕中线才算「读到这段」
    { rootMargin: `-${navHeight() + SUBNAV_H}px 0px -50% 0px` },
  )
  for (const it of props.items) {
    const el = document.getElementById(it.anchor)
    if (el) observer.observe(el)
  }
}

onMounted(() => {
  // 吸顶条在时，原生锚点与 scroll-padding 也要多让出它的高度
  document.documentElement.style.setProperty('--subnav-h', `${SUBNAV_H}px`)
  observe()
})
// 区块异步加载、筛选后重排：items 变化重新观察
watch(() => props.items.map(i => i.anchor).join('|'), () => requestAnimationFrame(observe))
onBeforeUnmount(() => {
  observer?.disconnect()
  document.documentElement.style.removeProperty('--subnav-h')
})
</script>

<style scoped>
.csn {
  position: sticky;
  top: var(--nav-h);
  z-index: 30;
  height: 48px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid var(--color-line);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
  backdrop-filter: saturate(180%) blur(16px);
}
/* 样式二顶栏 76px，吸顶位置跟着下移，否则会被顶栏压住 4px */
.csn--s2 { top: 76px; }
.csn-inner {
  display: flex;
  align-items: stretch;
  gap: 4px;
  height: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.csn-inner::-webkit-scrollbar { display: none; }
.csn-link {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0 14px;
  font-size: var(--text-fs-sm, 14px);
  color: var(--color-ink-500);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color var(--dur-fast, 150ms), border-color var(--dur-fast, 150ms);
}
.csn-link:hover { color: var(--color-ink-900); }
.csn-link.is-active { color: var(--color-brand-600); font-weight: 600; border-bottom-color: var(--color-brand-600); }
.csn--s2 .csn-link.is-active { color: var(--rs-primary); border-bottom-color: var(--rs-primary); }
.csn-link:focus-visible { outline: 2px solid var(--color-brand-600); outline-offset: -2px; }
</style>
