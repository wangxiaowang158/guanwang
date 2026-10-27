<template>
  <!-- 导航链接：外链栏目新窗口打开，站内栏目走路由；class、aria 等属性原样透传 -->
  <a v-if="external" :href="external" target="_blank" rel="noopener noreferrer">
    <slot />
    <span class="sr-only">（在新窗口打开）</span>
  </a>
  <RouterLink v-else :to="to"><slot /></RouterLink>
</template>

<script setup lang="ts">
// 菜单项既可能是站内页面，也可能是后台配置的外部链接（如「小鹿爱家技术服务」）
defineProps<{
  /** 站内地址 */
  to: string
  /** 外链地址（后端已校验为 http/https），有值时优先 */
  external?: string
}>()
</script>
