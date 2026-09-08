<template>
  <!-- 顶栏会员入口：未登录显示登录/注册，已登录显示昵称与下拉 -->
  <div class="me">
    <template v-if="!memberStore.isLoggedIn">
      <RouterLink to="/member/login" class="me-link">登录</RouterLink>
      <span class="me-sep">/</span>
      <RouterLink to="/member/register" class="me-link">注册</RouterLink>
    </template>

    <el-dropdown v-else trigger="click" @command="onCommand">
      <span class="me-user">
        <span class="me-avatar">{{ avatarText }}</span>
        {{ memberStore.displayName }}
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="center">会员中心</el-dropdown-item>
          <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
// 顶栏会员入口，样式一/样式二两套顶栏共用；文字色由外部 class 传入，子元素以 inherit 继承
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMemberStore } from '@/stores/member'

const route = useRoute()
const router = useRouter()
const memberStore = useMemberStore()

const avatarText = computed(() => memberStore.displayName.slice(0, 1))

/** 下拉命令分发 */
async function onCommand(command: string) {
  if (command === 'center') {
    await router.push('/member/center')
    return
  }
  memberStore.logout()
  // 当前页需登录时必须离开：清空登录态不触发导航，守卫不会重跑，
  // 留在原页会出现"已退出仍显示会员内容"，且后续请求无令牌
  if (route.meta.requiresMember) {
    await router.replace('/')
  }
}

// 顶栏常驻，挂载时用本地令牌恢复登录态（store 内部已做去重）
onMounted(() => {
  void memberStore.restore()
})
</script>
<style scoped>
.me {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.me-link,
.me-sep,
.me-user {
  color: inherit;
  text-decoration: none;
}

.me-link:hover {
  color: var(--brand-primary, #0ea5e9);
}

.me-sep {
  opacity: 0.4;
}

.me-user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.me-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand-primary, #0ea5e9);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
