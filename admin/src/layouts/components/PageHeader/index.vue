<template>
  <div class="page-header">
    <div class="header-left">
      <a-button type="text" @click="toggleCollapsed" class="fold-btn">
        <template #icon>
          <MenuFoldOutlined v-if="!collapsed" />
          <MenuUnfoldOutlined v-else />
        </template>
      </a-button>
      <a-breadcrumb :style="{ marginLeft: '12px' }">
        <a-breadcrumb-item>
          <HomeOutlined />
        </a-breadcrumb-item>
        <a-breadcrumb-item v-for="item in breadcrumbs" :key="item">
          {{ item }}
        </a-breadcrumb-item>
      </a-breadcrumb>
    </div>
    <div class="header-right">
      <a-button
        type="text"
        class="fullscreen-btn"
        :title="isFullscreen ? '退出全屏' : '全屏'"
        @click="toggleFullscreen"
      >
        <template #icon>
          <FullscreenExitOutlined v-if="isFullscreen" />
          <FullscreenOutlined v-else />
        </template>
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 页头：折叠按钮 + 面包屑（由栏目祖先链推导）+ 全屏切换
import { ref, computed, inject } from 'vue'
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  MenuFoldOutlined, MenuUnfoldOutlined, HomeOutlined,
  FullscreenOutlined, FullscreenExitOutlined
} from '@ant-design/icons-vue'
import { useChannels } from '@/composables/useChannels'

defineOptions({ name: 'PageHeader' })

const isFullscreen = inject<Ref<boolean>>('isFullscreen', ref(false))
const toggleFullscreen = inject<() => void>('toggleFullscreen', () => {})

const route = useRoute()
const { ancestors } = useChannels()

const emit = defineEmits(['update:collapsed'])
const props = defineProps<{ collapsed: boolean }>()

// 面包屑：栏目页取祖先链名称，非栏目页（素材库、栏目管理等）退回路由标题
const breadcrumbs = computed(() => {
  const key = route.params.channelKey as string
  if (key) return ancestors(key).map(c => c.name)
  const title = route.meta.title as string | undefined
  return title ? [title] : []
})

const toggleCollapsed = () => {
  emit('update:collapsed', !props.collapsed)
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  /* 半透明毛玻璃：吸顶后内容从下面滚过时仍隐约可见，不显得生硬 */
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(10px);
  border-bottom: 1px solid #eef0f4;
}

.header-left {
  display: flex;
  align-items: center;
}

.fold-btn {
  padding: 4px;
  height: 28px;
}

.header-right {
  display: flex;
  align-items: center;
}

.fullscreen-btn {
  color: #8c8c8c;
}

.fullscreen-btn:hover {
  color: #2f7cff;
  background: #f2f6ff;
}

.fold-btn:hover {
  color: #2f7cff;
  background: #f2f6ff;
}
</style>
