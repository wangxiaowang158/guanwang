<template>
  <div class="min-h-screen flex flex-col bg-white">
    <component :is="headerComp" />
    <main class="flex-1">
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
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import Style2Header from './Style2Header.vue'
import Style2Footer from './Style2Footer.vue'
import QuickActions from './QuickActions.vue'

const theme = useThemeStore()
const headerComp = computed(() => (theme.isStyle2 ? Style2Header : AppHeader))
const footerComp = computed(() => (theme.isStyle2 ? Style2Footer : AppFooter))
</script>

<style scoped>
.page-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
</style>
