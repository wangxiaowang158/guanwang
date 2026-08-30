<template>
  <PageContainer>
    <component :is="currentComp" v-if="channel" :key="channel.key" :channel="channel" />
    <a-empty v-else-if="loaded" description="栏目不存在" style="margin-top: 80px" />
    <a-spin v-else style="display: block; margin-top: 120px; text-align: center" />
  </PageContainer>
</template>

<script setup lang="ts">
// CMS 调度视图：按当前栏目 type 渲染对应页面
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PageContainer from '@/components/PageContainer/index.vue'
import { useChannels } from '@/composables/useChannels'
import type { Channel } from '@/api/cms'
import ContentList from './ContentList.vue'
import SingleEdit from './SingleEdit.vue'
import SiteConfig from './SiteConfig.vue'
import AdminList from './AdminList.vue'
import MemberList from './MemberList.vue'
import FeedbackList from './FeedbackList.vue'
import AuthConfig from './AuthConfig.vue'
import LoginLogList from './LoginLogList.vue'

const route = useRoute()
const { load, loaded, findByKey } = useChannels()

const channel = ref<Channel | null>(null)

// 类型 → 组件映射
const COMP_MAP = {
  list: ContentList,
  single: SingleEdit,
  siteconfig: SiteConfig,
  admins: AdminList,
  // 会员中心四项走真实后端
  members: MemberList,
  feedback: FeedbackList,
  authconfig: AuthConfig,
  loginlog: LoginLogList
} as const

const currentComp = computed(() => {
  if (!channel.value) return null
  return COMP_MAP[channel.value.type as keyof typeof COMP_MAP] || null
})

const resolve = () => {
  const key = route.params.channelKey as string
  channel.value = findByKey(key) || null
}

onMounted(async () => {
  await load()
  resolve()
})

watch(() => route.params.channelKey, resolve)
</script>
