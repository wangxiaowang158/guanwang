<template>
  <!-- 顶栏会员入口：未登录显示登录/注册，已登录显示昵称与下拉 -->
  <div class="me">
    <template v-if="!memberStore.isLoggedIn">
      <RouterLink to="/member/login" class="me-link" :class="linkClass">登录</RouterLink>
      <span class="me-sep" :class="linkClass">/</span>
      <RouterLink to="/member/register" class="me-link" :class="linkClass">注册</RouterLink>
    </template>

    <el-dropdown v-else trigger="click" @command="onCommand">
      <span class="me-user" :class="linkClass">
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
// 顶栏会员入口，样式一/样式二两套顶栏共用；文字色由外部传入以适配深浅底
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberStore } from '@/stores/member'

defineProps<{
  /** 外部传入的文字颜色类，用于适配顶栏深浅底 */
  linkClass?: string
}>()

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
  // 退出后停留在当前页，仅刷新登录态展示
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
