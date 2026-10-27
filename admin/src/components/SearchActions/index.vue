<template>
  <!-- 查询区统一的「搜索 / 重置」按钮组：筛选条件改动后点搜索才查，重置清空条件并回到首页 -->
  <a-space :size="12">
    <a-button type="primary" :loading="loading" @click="emit('search')">
      <template #icon><SearchOutlined /></template>
      搜索
    </a-button>
    <a-button @click="emit('reset')">
      <template #icon><ReloadOutlined /></template>
      重置
    </a-button>
  </a-space>
</template>

<script setup lang="ts">
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'

defineOptions({ name: 'SearchActions' })

defineProps<{ loading?: boolean }>()
const emit = defineEmits<{ search: []; reset: [] }>()
</script>
