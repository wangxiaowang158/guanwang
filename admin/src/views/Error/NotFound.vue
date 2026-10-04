<template>
  <PageContainer>
    <!-- 404：地址不存在时给出明确结果，不再渲染成空白布局 -->
    <a-result status="404" title="404" sub-title="页面不存在，地址可能已调整或输入有误">
      <template #extra>
        <a-button type="primary" @click="goLanding">返回首页</a-button>
      </template>
    </a-result>
  </PageContainer>
</template>

<script setup lang="ts">
// 后台 404 页：承接所有未匹配地址，套在主布局内以保留侧边栏导航
import { useRouter } from 'vue-router'
import PageContainer from '@/components/PageContainer/index.vue'
import { useChannels } from '@/composables/useChannels'

const router = useRouter()
const { landingPath } = useChannels()

/**
 * 回到当前账号有权访问的落地页
 * 不直接写 '/'：根路径会重定向到 /dashboard，而仪表盘未必在该账号的授权范围内，
 * 那样会被路由守卫再弹一次「无访问权限」
 */
function goLanding(): void {
  const target = landingPath()
  router.replace(target || '/')
}
</script>
