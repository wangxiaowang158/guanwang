<!-- 后台登录认证页（F01）：账号密码登录，含失败统一提示、登录失败限流冷却、网络异常处理 -->
<template>
  <div class="login-wrapper">
    <div class="login-container">
      <div class="login-box">
        <!-- 左侧品牌区 -->
        <div class="login-left">
          <div class="brand">
            <SafetyOutlined class="brand-icon" />
            <h1>{{ BRAND_TITLE }}</h1>
            <p>内容自主维护 · 开箱即部署</p>
          </div>
        </div>
        <!-- 右侧表单区 -->
        <div class="login-right">
          <div class="form-wrapper">
            <h2 class="form-title">登录</h2>
            <p class="form-desc">{{ BRAND_TITLE }}</p>
            <a-form :model="form" @finish="handleLogin">
              <a-form-item name="username" :rules="usernameRules">
                <a-input
                  v-model:value="form.username"
                  placeholder="用户名"
                  size="large"
                  :maxlength="50"
                  allow-clear
                >
                  <template #prefix><UserOutlined class="input-icon" /></template>
                </a-input>
              </a-form-item>
              <a-form-item name="password" :rules="passwordRules">
                <a-input-password
                  v-model:value="form.password"
                  placeholder="密码"
                  size="large"
                  :maxlength="100"
                >
                  <template #prefix><LockOutlined class="input-icon" /></template>
                </a-input-password>
              </a-form-item>
              <!-- 错误提示：登录失败或限流时停留页面展示 -->
              <a-form-item v-if="errorMsg" style="margin-bottom: 12px">
                <a-alert :message="errorMsg" type="error" show-icon />
              </a-form-item>
              <a-form-item style="margin-bottom: 0">
                <a-button
                  type="primary"
                  html-type="submit"
                  :loading="loading"
                  :disabled="locked"
                  block
                  size="large"
                >
                  {{ buttonText }}
                </a-button>
              </a-form-item>
            </a-form>
            <!-- 默认账号提示仅开发环境展示，生产构建不渲染，防凭证泄露 -->
            <a-alert
              v-if="isDev"
              message="默认账号：admin / 123456"
              type="info"
              show-icon
              style="margin-top: 20px"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="copyright">© 2026 {{ COMPANY_NAME }} 版权所有</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { Rule } from 'ant-design-vue/es/form'
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons-vue'
import { login } from '@/api/auth'
import { useUserStore } from '@/store'

// 站点品牌文案（实际公司名后续由站点配置维护）
const BRAND_TITLE = '中瑞恒后台管理'
const COMPANY_NAME = '中瑞恒(北京)科技有限公司'

// 默认账号提示仅开发环境展示
const isDev = import.meta.env.DEV

// 登录失败限流配置：默认 5 次 / 10 分钟，达阈值后按钮冷却禁用
const MAX_FAIL_COUNT = 5
const COOLDOWN_SECONDS = 10 * 60

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')

// 失败计数与冷却倒计时
const failCount = ref(0)
const cooldownLeft = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// 锁定态：冷却中按钮不可点击
const locked = computed(() => cooldownLeft.value > 0)

// 按钮文案随状态变化
const buttonText = computed(() => {
  if (locked.value) return `请稍后再试（${cooldownLeft.value}s）`
  if (loading.value) return '登录中...'
  return '登 录'
})

// 表单校验规则
const usernameRules: Rule[] = [{ required: true, message: '请输入用户名', trigger: 'blur' }]
const passwordRules: Rule[] = [{ required: true, message: '请输入密码', trigger: 'blur' }]

/** 启动冷却倒计时，结束后自动恢复可点击并清零失败计数 */
const startCooldown = () => {
  // 先清除可能存在的旧定时器，防重复调用导致倒计时叠加与内存泄漏
  clearCooldown()
  cooldownLeft.value = COOLDOWN_SECONDS
  errorMsg.value = '操作过于频繁，请稍后再试'
  cooldownTimer = setInterval(() => {
    cooldownLeft.value -= 1
    if (cooldownLeft.value <= 0) {
      clearCooldown()
      failCount.value = 0
      errorMsg.value = ''
    }
  }, 1000)
}

/** 清除冷却定时器 */
const clearCooldown = () => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
  cooldownLeft.value = 0
}

/** 累计一次登录失败，达阈值则进入冷却 */
const recordFail = () => {
  failCount.value += 1
  if (failCount.value >= MAX_FAIL_COUNT) {
    startCooldown()
  }
}

/** 解析回跳目标，仅允许同源站内路径，否则回退首页（防开放重定向） */
const resolveRedirect = (raw: string): string => {
  if (!raw) return '/'
  try {
    const url = new URL(raw, window.location.origin)
    if (url.origin === window.location.origin) {
      return url.pathname + url.search + url.hash
    }
  } catch {
    // 非法 URL 直接回退
  }
  return '/'
}

/** 提交登录：校验通过后调接口，处理成功/失败/网络异常三种结果 */
const handleLogin = async () => {
  if (locked.value || loading.value) return
  errorMsg.value = ''
  loading.value = true
  try {
    const { data: res } = await login({ username: form.username, password: form.password })
    if (res.code === 200 && res.data) {
      // 成功：保存凭证，无提示跳转（仪表盘 F14 完成后默认改为 /dashboard）
      userStore.setToken(res.data.token)
      userStore.setUsername(res.data.username)
      failCount.value = 0
      // 优先回跳拦截前的目标页；用同源校验防开放重定向（拦截 //evil.com、/\evil.com）
      const redirect = route.query.redirect
      router.push(resolveRedirect(typeof redirect === 'string' ? redirect : ''))
    } else {
      // 失败：清空密码、保留用户名、统一脱敏提示
      form.password = ''
      errorMsg.value = res.message || '账号或密码错误，请重新输入'
      recordFail()
    }
  } catch {
    // 网络/服务器异常：保留已填内容
    errorMsg.value = '网络异常，请稍后重试'
  } finally {
    loading.value = false
  }
}

onUnmounted(clearCooldown)
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  padding: 20px;
  position: relative;
}

.login-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.login-box {
  display: flex;
  width: 100%;
  max-width: 700px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
}

.login-left {
  flex: 1;
  /* 深蓝科技风主色，呼应官网整体基调 */
  background: linear-gradient(135deg, #0a2a66 0%, #1677ff 100%);
  padding: 40px 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  text-align: center;
  color: #fff;
}

.brand-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.brand h1 {
  font-size: 26px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #fff;
}

.brand p {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
}

.login-right {
  flex: 1;
  padding: 40px 35px;
  display: flex;
  align-items: center;
}

.form-wrapper {
  width: 100%;
}

.form-title {
  font-size: 22px;
  font-weight: 500;
  color: #262626;
  margin: 0 0 8px 0;
}

.form-desc {
  font-size: 13px;
  color: #8c8c8c;
  margin: 0 0 24px 0;
}

.input-icon {
  color: rgba(0, 0, 0, 0.25);
}

.copyright {
  text-align: center;
  color: #8c8c8c;
  font-size: 14px;
  padding: 20px;
}

/* 移动端：两栏切换为纵向单栏 */
@media (max-width: 768px) {
  .login-box {
    flex-direction: column;
    max-width: 400px;
  }
}
</style>

