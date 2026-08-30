<template>
  <div class="app-header">
    <div class="header-left">
      <span class="logo-icon">中</span>
      <h1 class="logo">中瑞恒后台管理</h1>
    </div>
    <div class="header-right">
      <a-space :size="28">
        <span class="nav-item" @click="goHome">
          <HomeOutlined />
          <span>主页</span>
        </span>
        <span class="nav-item">
          <DatabaseOutlined />
          <span>服务器信息</span>
        </span>
        <span class="nav-item" @click="openSite">
          <GlobalOutlined />
          <span>进入网站</span>
        </span>
        <a-dropdown>
          <span class="nav-item user">HI,{{ username }}</span>
          <template #overlay>
            <a-menu>
              <a-menu-item key="settings" @click="$emit('openSettings')">
                <SettingOutlined />
                <span>设置</span>
              </a-menu-item>
              <a-menu-item key="logout" @click="handleLogout">
                <LogoutOutlined />
                <span>退出登录</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
// 顶栏：品牌 + 主页/服务器信息/进入网站/HI,管理员/退出
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  HomeOutlined, DatabaseOutlined, GlobalOutlined,
  SettingOutlined, LogoutOutlined
} from '@ant-design/icons-vue'
import { logout } from '@/api/auth'
import { getSiteInfo } from '@/api/cms'
import { useUserStore } from '@/store'

defineEmits(['openSettings'])

const router = useRouter()
const userStore = useUserStore()
const username = computed(() => userStore.state.value.username || '管理员')

// 前台官网地址取自站点配置，避免写死域名
const siteWebsite = ref('')

onMounted(async () => {
  try {
    const { data } = await getSiteInfo()
    if (data.code === 200) siteWebsite.value = data.data?.website || ''
  } catch {
    // 取站点信息失败不影响顶栏其它功能，点击"进入网站"时再提示
  }
})

const goHome = () => {
  router.push('/')
}

// 进入前台官网（新标签页）；地址来自站点配置，未配置时提示而非跳错地址
const openSite = () => {
  const url = siteWebsite.value.trim()
  if (!url) {
    message.warning('尚未配置网站地址，请先在站点配置中填写')
    return
  }
  // 站点配置可能只填域名（如 www.example.com），补全协议避免被当作相对路径
  const target = /^https?:\/\//.test(url) ? url : `https://${url}`
  window.open(target, '_blank', 'noopener,noreferrer')
}

/** 退出登录：清除凭证后跳转登录页 */
const handleLogout = async () => {
  try {
    await logout()
  } finally {
    userStore.clearUser()
    message.success('退出成功')
    router.push('/login')
  }
}
</script>

<style scoped>
.app-header {
  height: 55px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  width: 200px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  background: #2f7cff;
}

.logo-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #fff;
  color: #2f7cff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.logo {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: #fff;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  padding: 0 28px;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #595959;
  font-size: 14px;
  transition: color 0.15s;
}

.nav-item:hover {
  color: #2f7cff;
}

.nav-item.user {
  font-weight: 600;
  color: #262626;
}

.nav-item.logout {
  color: #8c8c8c;
}
</style>
