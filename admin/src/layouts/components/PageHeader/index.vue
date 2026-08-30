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

const isFullscreen = inject<Ref<boolean>>('isFullscreen', ref(false))
const toggleFullscreen = inject<() => void>('toggleFullscreen', () => {})

const route = useRoute()
const { ancestors } = useChannels()

const emit = defineEmits(['update:collapsed'])
const props = defineProps<{ collapsed: boolean }>()

// 面包屑：当前栏目的祖先链名称
const breadcrumbs = computed(() => {
  const key = route.params.channelKey as string
  if (!key) return []
  return ancestors(key).map(c => c.name)
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
  height: 40px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
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
  color: #262626;
  background: #f5f5f5;
}
</style>
