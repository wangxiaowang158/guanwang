<template>
  <!-- 快捷操作区：电话 / 微信（二维码已配置才显示）/ 回到页首；悬停或键盘聚焦都能展开提示 -->
  <div
    ref="rootRef"
    class="qa fixed right-4 bottom-24 z-40 flex flex-col items-end gap-2"
    :class="{ 'qa--style2': theme.isStyle2 }"
    @keydown.esc="closeMenu"
  >
    <!-- 预约入口：收起为一个按钮，展开后列出四类线索入口，避免窄屏上并排四个图标 -->
    <div v-if="menuOpen" id="qa-lead-menu" class="qa-menu" role="group" aria-label="预约与咨询">
      <button v-for="opt in LEAD_ENTRIES" :key="opt" type="button" class="qa-menu-item" @click="openFrom(opt)">
        {{ LEAD_TYPE_LABEL[opt] }}
      </button>
    </div>
    <button
      ref="toggleRef"
      type="button"
      class="qa-btn qa-btn--primary"
      :aria-expanded="menuOpen"
      aria-controls="qa-lead-menu"
      :aria-label="menuOpen ? '收起预约咨询入口' : '展开预约咨询入口'"
      @click="menuOpen = !menuOpen"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 10h8M8 14h5m-9 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14z" />
      </svg>
    </button>

    <a v-if="site.phone" :href="`tel:${site.phone}`" class="qa-btn group" :aria-label="`拨打电话 ${site.phone}`">
      <PhoneIcon class="w-5 h-5" />
      <span class="qa-tip tabular-nums">{{ site.phone }}</span>
    </a>

    <!-- 用 button 而非 div：键盘可聚焦，聚焦时同样展开二维码 -->
    <button v-if="site.wechatQr" type="button" class="qa-btn group" aria-label="微信咨询，显示二维码">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-3.898-6.348-7.596-6.348z" />
      </svg>
      <span class="qa-tip qa-tip--qr">
        <img :src="site.wechatQr" alt="微信二维码" class="w-28 h-28 object-contain" width="112" height="112" />
      </span>
    </button>

    <Transition name="fade">
      <button v-if="showTop" type="button" class="qa-btn qa-btn--primary" aria-label="回到页首" @click="scrollToTop">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
// 快捷操作区：在线咨询/预约测算/预约演示/渠道招商（打开线索弹窗）+ 电话/微信/回到页首；配色跟随当前模板
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LEAD_TYPE_LABEL } from '@/api/feedback'
import type { LeadType } from '@/api/feedback'
import { useLeadModal } from '@/composables/useLeadModal'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import { useWindowScroll, scrollToTop } from '@/composables/useWindowScroll'
import PhoneIcon from './PhoneIcon.vue'

/** 入口顺序：咨询 → 测算 → 演示 → 招商 */
const LEAD_ENTRIES: LeadType[] = ['consult', 'energyAssess', 'productDemo', 'channel']

const siteStore = useSiteStore()
const theme = useThemeStore()
const site = computed(() => siteStore.site)
const { scrollY } = useWindowScroll()
const { openLead } = useLeadModal()

/** 滚动超过一屏左右才出现回到页首 */
const showTop = computed(() => scrollY.value > 600)

const rootRef = ref<HTMLElement>()
const toggleRef = ref<HTMLButtonElement>()
const menuOpen = ref(false)

function closeMenu(): void {
  menuOpen.value = false
}

/**
 * 选中入口：收起菜单并打开弹窗
 * 先把焦点移到常驻的展开按钮：被点的菜单项随菜单收起会从 DOM 卸载，
 * 弹窗若把它记作"打开前的焦点"，关闭时还原不回去，焦点会掉到页面顶部
 */
function openFrom(type: LeadType): void {
  toggleRef.value?.focus()
  closeMenu()
  openLead(type)
}

/** 点击组件外部时收起菜单 */
function onOutsidePointer(e: PointerEvent): void {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) closeMenu()
}

watch(menuOpen, (on) => {
  if (on) document.addEventListener('pointerdown', onOutsidePointer)
  else document.removeEventListener('pointerdown', onOutsidePointer)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsidePointer))

onMounted(() => {
  // store 内部已做去重，重复调用不会产生额外请求
  siteStore.fetchSite()
})
</script>

<style scoped>
.qa { --qa-accent: var(--color-brand-600); --qa-radius: var(--radius-md); }
.qa--style2 { --qa-accent: var(--rs-primary); --qa-radius: 0; }

.qa-btn {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--qa-radius);
  box-shadow: var(--shadow-2);
  color: var(--color-ink-500);
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast);
}
.qa-btn:hover,
.qa-btn:focus-visible { color: var(--qa-accent); border-color: var(--qa-accent); }
.qa-btn--primary { background: var(--qa-accent); border-color: var(--qa-accent); color: #fff; }
.qa-btn--primary:hover,
.qa-btn--primary:focus-visible { color: #fff; filter: brightness(1.1); }

/* 提示气泡：悬停与键盘聚焦都显示 */
.qa-tip {
  position: absolute;
  right: calc(100% + 8px);
  padding: 6px 10px;
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
  background: var(--color-ink-900);
  border-radius: var(--radius-sm);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-fast);
}
.qa-tip--qr { padding: 8px; background: #fff; border: 1px solid var(--color-line); box-shadow: var(--shadow-2); }
.qa-btn:hover .qa-tip,
.qa-btn:focus-visible .qa-tip { opacity: 1; }

/* 展开的预约入口列表 */
.qa-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--qa-radius);
  box-shadow: var(--shadow-2);
}
.qa-menu-item {
  min-height: 44px;
  padding: 0 18px;
  font-size: 14px;
  color: var(--color-ink-700);
  white-space: nowrap;
  text-align: left;
  background: none;
  border: 0;
  border-radius: var(--qa-radius);
  cursor: pointer;
  transition: color var(--dur-fast), background var(--dur-fast);
}
.qa-menu-item:hover,
.qa-menu-item:focus-visible { color: #fff; background: var(--qa-accent); }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
