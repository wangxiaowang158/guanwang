<template>
  <div class="app-header">
    <div class="header-left">
      <span class="logo-icon">中</span>
      <h1 class="logo">中瑞恒后台管理</h1>
    </div>
    <div class="header-right">
      <a-space :size="6">
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
          <span class="user-chip">
            <span class="user-avatar">{{ avatarText }}</span>
            <span class="user-name">{{ username }}</span>
            <DownOutlined class="user-caret" />
          </span>
          <template #overlay>
            <a-menu>
              <a-menu-item key="settings" @click="$emit('openSettings')">
                <SettingOutlined />
                <span>设置</span>
              </a-menu-item>
              <a-menu-item key="password" @click="pwdVisible = true">
                <KeyOutlined />
                <span>修改密码</span>
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

    <ChangePasswordModal v-model:open="pwdVisible" @success="onPasswordChanged" />
  </div>
</template>

<script setup lang="ts">
// 顶栏：品牌 + 主页/服务器信息/进入网站/HI,管理员（设置·修改密码·退出）
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  HomeOutlined, DatabaseOutlined, GlobalOutlined,
  SettingOutlined, LogoutOutlined, KeyOutlined, DownOutlined
} from '@ant-design/icons-vue'
import { logout } from '@/api/auth'
import { getSiteInfo } from '@/api/cms'
import { useUserStore } from '@/store'
import ChangePasswordModal from './ChangePasswordModal.vue'

defineOptions({ name: 'AppHeader' })

defineEmits(['openSettings'])

// 改密弹窗开关
const pwdVisible = ref(false)

const router = useRouter()
const userStore = useUserStore()
const username = computed(() => userStore.state.value.username || '管理员')
// 头像取账号首字，英文转大写
const avatarText = computed(() => username.value.slice(0, 1).toUpperCase())

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

/**
 * 改密成功后强制重新登录
 * 旧令牌签发时的密码已失效，继续用它访问会在某个接口上突然 401；
 * 主动清掉并回登录页，比让用户在半失效状态里点来点去清楚
 */
const onPasswordChanged = () => {
  userStore.clearUser()
  router.push('/login')
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
  box-shadow: 0 1px 0 #eef0f4, 0 2px 8px rgba(15, 23, 42, 0.04);
}

/* 品牌区与侧栏同色，左侧连成一整条深色竖带 */
.header-left {
  width: 200px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  background: #152036;
  /* 用同色 1px 阴影盖住 .app-header 底部浅色分隔线，避免品牌区与侧栏之间出现白线 */
  box-shadow: 0 1px 0 #152036;
}

.logo-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #5b9bff 0%, #2f7cff 55%, #1d5fe0 100%);
  box-shadow: 0 4px 10px rgba(47, 124, 255, 0.4);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.logo {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin: 0;
  color: #fff;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  padding: 0 24px;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  cursor: pointer;
  color: #5b6475;
  font-size: 14px;
  line-height: 1;
  transition: color 0.15s, background-color 0.15s;
}

.nav-item:hover {
  color: #2f7cff;
  background: #f2f6ff;
}

/* 用户：头像 + 账号 + 下拉箭头，做成可点的胶囊 */
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  margin-left: 10px;
  padding: 0 10px 0 4px;
  border: 1px solid #eef0f4;
  border-radius: 18px;
  cursor: pointer;
  line-height: 1;
  transition: border-color 0.15s, background-color 0.15s;
}

.user-chip:hover {
  border-color: #d6e4ff;
  background: #f7faff;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5b9bff, #2f7cff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-name {
  color: #262f3d;
  font-size: 14px;
  font-weight: 500;
}

.user-caret {
  color: #98a2b3;
  font-size: 10px;
}
</style>
