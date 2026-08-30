<template>
  <a-layout style="min-height: 100vh">
    <!-- 顶部 Header，全屏时向上滑出 -->
    <a-layout-header
      :style="{
        position: 'fixed', top: isFullscreen ? '-55px' : '0',
        left: 0, right: 0, zIndex: 999, padding: 0,
        height: '55px', lineHeight: '55px',
        transition: 'top 0.3s ease'
      }"
    >
      <AppHeader @open-settings="showSettings = true" />
    </a-layout-header>

    <a-layout
      :style="{
        marginTop: isFullscreen ? '0' : '55px',
        height: isFullscreen ? '100vh' : 'calc(100vh - 55px)',
        transition: 'margin-top 0.3s ease'
      }"
    >
      <!-- 左侧侧边栏，全屏时向左滑出 -->
      <AppSidebar
        v-model:collapsed="collapsed"
        :style="{
          position: 'fixed', left: isFullscreen ? '-200px' : '0',
          top: '55px', bottom: 0,
          height: 'calc(100vh - 55px)', overflowY: 'auto',
          transition: 'left 0.3s ease'
        }"
      />

      <!-- 内容区，全屏时撑满 -->
      <a-layout
        :style="{
          marginLeft: isFullscreen ? '0' : (collapsed ? '80px' : '200px'),
          transition: 'margin-left 0.3s ease',
          overflowX: 'hidden',
          overflowY: 'auto',
          height: isFullscreen ? '100vh' : 'calc(100vh - 55px)'
        }"
      >
        <PageHeader v-model:collapsed="collapsed" style="position: sticky; top: 0; z-index: 10" />
        <a-layout-content :style="{ margin: '16px' }">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </a-layout-content>
      </a-layout>
    </a-layout>

    <a-drawer v-model:open="showSettings" title="设置" placement="right" :width="320">
      <div class="settings-content">
        <div class="setting-item">
          <div class="setting-label">主题模式</div>
          <div class="setting-control">
            <a-segmented v-model:value="themeMode" :options="themeModeOptions" />
          </div>
        </div>
      </div>
    </a-drawer>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import AppHeader from '../components/AppHeader/index.vue'
import AppSidebar from '../components/AppSidebar/index.vue'
import PageHeader from '../components/PageHeader/index.vue'
import { useTheme } from '@/composables/useTheme'

const showSettings = ref(false)
const collapsed = ref(false)
const isFullscreen = ref(false)

// 向子组件提供全屏切换方法
provide('toggleFullscreen', () => { isFullscreen.value = !isFullscreen.value })
provide('isFullscreen', isFullscreen)
const { isDark, toggleTheme } = useTheme()

const themeMode = computed({
  get: () => isDark.value ? 'dark' : 'light',
  set: (val: string) => {
    if ((val === 'dark') !== isDark.value) {
      toggleTheme()
    }
  }
})

const themeModeOptions = [
  { label: '亮色', value: 'light' },
  { label: '暗色', value: 'dark' }
]
</script>

<style scoped>
.settings-content {
  padding: 8px 0;
}

.setting-item {
  margin-bottom: 24px;
}

.setting-label {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
}

.setting-control {
  display: flex;
  justify-content: flex-start;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
