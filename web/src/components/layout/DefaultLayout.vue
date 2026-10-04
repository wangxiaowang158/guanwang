<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- 跳到正文：键盘用户不必每页都 Tab 过整条导航 -->
    <a href="#main" class="skip-link">跳到正文</a>
    <component :is="headerComp" />
    <main id="main" class="flex-1" tabindex="-1">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <div :key="route.path">
            <component :is="Component" />
          </div>
        </Transition>
      </RouterView>
    </main>
    <component :is="footerComp" />
    <QuickActions />
  </div>
</template>

<script setup lang="ts">
// 主题感知布局：按当前模板解析顶栏/页脚组件
// 两套模板按需异步加载：访客只会用到其中一套，静态 import 会把两套都打进首屏包
import { computed, defineAsyncComponent } from 'vue'
import { useThemeStore } from '@/stores/theme'
import QuickActions from './QuickActions.vue'

const AppHeader = defineAsyncComponent(() => import('./AppHeader.vue'))
const AppFooter = defineAsyncComponent(() => import('./AppFooter.vue'))
const Style2Header = defineAsyncComponent(() => import('./Style2Header.vue'))
const Style2Footer = defineAsyncComponent(() => import('./Style2Footer.vue'))

const theme = useThemeStore()
const headerComp = computed(() => (theme.isStyle2 ? Style2Header : AppHeader))
const footerComp = computed(() => (theme.isStyle2 ? Style2Footer : AppFooter))
</script>

<style scoped>
.page-enter-active {
  transition: opacity var(--dur-base) ease, transform var(--dur-base) ease;
}
.page-leave-active {
  transition: opacity var(--dur-fast) ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}

/* 平时移出可视区，获得键盘焦点时才出现 */
.skip-link {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 100;
  padding: 8px 16px;
  background: var(--color-brand-600);
  color: #fff;
  font-size: 14px;
  border-radius: var(--radius-md);
  transform: translateY(-200%);
  transition: transform var(--dur-fast) ease;
}
.skip-link:focus {
  transform: translateY(0);
}
</style>
