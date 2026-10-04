<template>
  <!-- 快捷操作区：电话 / 微信（二维码已配置才显示）/ 回到页首；悬停或键盘聚焦都能展开提示 -->
  <div class="qa fixed right-4 bottom-24 z-40 flex flex-col gap-2" :class="{ 'qa--style2': theme.isStyle2 }">
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
// 快捷操作区：电话/微信/回到页首；微信二维码未配置时不显示；配色跟随当前模板
import { computed, onMounted } from 'vue'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import { useWindowScroll, scrollToTop } from '@/composables/useWindowScroll'
import PhoneIcon from './PhoneIcon.vue'

const siteStore = useSiteStore()
const theme = useThemeStore()
const site = computed(() => siteStore.site)
const { scrollY } = useWindowScroll()

/** 滚动超过一屏左右才出现回到页首 */
const showTop = computed(() => scrollY.value > 600)

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

.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
