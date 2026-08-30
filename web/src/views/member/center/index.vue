<template>
  <!-- 会员中心：反馈提交、反馈记录、账号设置三块，随官网顶栏一起呈现 -->
  <div class="center">
    <header class="center-head">
      <div class="center-head-inner">
        <div class="center-user">
          <span class="center-avatar">{{ avatarText }}</span>
          <div class="center-user-text">
            <h1 class="center-name">{{ memberStore.displayName }}</h1>
            <p class="center-phone">{{ maskedPhone }}</p>
          </div>
        </div>
        <el-button plain @click="onLogout">退出登录</el-button>
      </div>
    </header>

    <div class="center-body">
      <el-tabs v-model="tab">
        <el-tab-pane label="提交反馈" name="submit">
          <FeedbackForm @submitted="onFeedbackSubmitted" />
        </el-tab-pane>
        <el-tab-pane label="我的反馈" name="list">
          <MyFeedback ref="feedbackListRef" />
        </el-tab-pane>
        <el-tab-pane label="账号设置" name="account">
          <AccountSettings />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>
<script setup lang="ts">
// 会员中心页：三个页签切换，提交反馈后自动刷新反馈记录
import { computed, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import FeedbackForm from './FeedbackForm.vue'
import MyFeedback from './MyFeedback.vue'
import AccountSettings from './AccountSettings.vue'
import { useMemberStore } from '@/stores/member'

const router = useRouter()
const memberStore = useMemberStore()

const tab = ref('submit')
const feedbackListRef = useTemplateRef<InstanceType<typeof MyFeedback>>('feedbackListRef')

/** 头像占位取昵称首字 */
const avatarText = computed(() => memberStore.displayName.slice(0, 1))

/** 手机号中间四位遮蔽 */
const maskedPhone = computed(() => {
  const phone = memberStore.profile?.phone
  if (!phone || phone.length !== 11) return ''
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
})

/**
 * 提交成功后切到记录页，让用户立刻看到刚提交的内容
 * 页签懒挂载：首次切换由子组件 onMounted 自行拉取，
 * 已挂载过则在此主动刷新（此时 ref 非空），两种情况都不会重复请求
 */
function onFeedbackSubmitted() {
  void feedbackListRef.value?.load()
  tab.value = 'list'
}

async function onLogout() {
  memberStore.logout()
  await router.replace('/')
}
</script>
<style scoped>
/* 顶栏为 fixed 64px，此处补足避让 */
.center {
  padding-top: 64px;
  min-height: 70vh;
  background: var(--zrh-bg-page, #f8fafc);
}

.center-head {
  background: #fff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.center-head-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.center-user {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.center-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--brand-primary, #0ea5e9);
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.center-user-text {
  min-width: 0;
}

.center-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.center-phone {
  margin: 4px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

.center-body {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
}

.center-body :deep(.el-tabs__content) {
  padding-top: 8px;
}

@media (max-width: 640px) {
  .center-head-inner {
    padding: 20px 16px;
  }

  .center-body {
    padding: 16px;
  }
}
</style>
