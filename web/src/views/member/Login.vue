<template>
  <AuthShell title="会员登录" subtitle="登录后可提交反馈并查看回复">
    <el-alert v-if="errorText" type="error" :closable="false" show-icon class="auth-alert">
      {{ errorText }}
    </el-alert>

    <!-- 两种登录方式由后台配置控制，均关闭时不渲染表单 -->
    <el-tabs v-if="methods.length > 1" v-model="method" class="auth-tabs">
      <el-tab-pane label="密码登录" name="password" />
      <el-tab-pane label="短信登录" name="smsCode" />
    </el-tabs>

    <el-form v-if="methods.length" label-position="top" @submit.prevent="onSubmit">
      <el-form-item label="手机号">
        <el-input v-model="form.phone" maxlength="11" placeholder="请输入手机号" />
      </el-form-item>

      <el-form-item v-if="method === 'password'" label="密码">
        <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
      </el-form-item>

      <el-form-item v-else label="短信验证码">
        <div class="field-inline">
          <el-input v-model="form.smsCode" maxlength="6" placeholder="请输入验证码" />
          <SmsCodeButton :phone="form.phone" purpose="login" @fail="errorText = $event" />
        </div>
      </el-form-item>

      <!-- 图形验证码仅在后端判定需要时出现（连续失败达到阈值） -->
      <el-form-item v-if="captcha" label="图形验证码">
        <div class="field-inline">
          <el-input v-model="form.captcha" placeholder="请计算并填写结果" />
          <div class="captcha-question" @click="loadCaptcha">{{ captcha.question }}</div>
        </div>
      </el-form-item>

      <el-button type="primary" class="auth-submit" :loading="submitting" @click="onSubmit">
        登录
      </el-button>
    </el-form>

    <el-alert v-else type="warning" :closable="false" show-icon>
      当前登录功能已关闭，请联系管理员。
    </el-alert>

    <div v-if="methods.length" class="auth-links">
      <RouterLink to="/member/forgot">忘记密码？</RouterLink>
    </div>
    <template #foot>
      <!-- 注册入口随后台「开放注册」开关显隐 -->
      <template v-if="config?.registerOpen">
        还没有账号？<RouterLink to="/member/register">立即注册</RouterLink>
      </template>
      <template v-else>暂未开放注册</template>
    </template>
  </AuthShell>
</template>
<script setup lang="ts">
// 会员登录页：密码 / 短信双方式，方式可用性与图形验证码时机均由后端控制
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from './AuthShell.vue'
import SmsCodeButton from './SmsCodeButton.vue'
import {
  fetchAuthConfig, fetchCaptcha, login, isAuthSuccess,
  type CaptchaChallenge, type LoginMethod, type PortalAuthConfig,
} from '@/api/memberAuth'
import { useMemberStore } from '@/stores/member'
import { REAL_API_SUCCESS_CODE } from '@/config'

const route = useRoute()
const router = useRouter()
const memberStore = useMemberStore()

const config = ref<PortalAuthConfig | null>(null)
const captcha = ref<CaptchaChallenge | null>(null)
const method = ref<LoginMethod>('password')
const submitting = ref(false)
const errorText = ref('')

const form = reactive({ phone: '', password: '', smsCode: '', captcha: '' })

/** 后台允许的登录方式；配置未回来前默认只给密码登录 */
const methods = computed<LoginMethod[]>(() => {
  if (!config.value) return ['password']
  const list: LoginMethod[] = []
  if (config.value.allowPasswordLogin) list.push('password')
  if (config.value.allowSmsLogin) list.push('smsCode')
  return list
})
/**
 * 校验并归一化 redirect 参数
 * redirect 来自 URL 属外部输入，只接受站内单斜杠路径；
 * 协议地址与 //host 形式一律丢弃，避免被用作开放重定向
 * @param value 路由 query 里的 redirect
 * @returns 可安全跳转的站内路径
 */
function safeRedirect(value: unknown): string {
  const fallback = '/member/center'
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }
  // 登录页自身与认证页不作为跳回目标，避免绕圈
  if (value.startsWith('/member/login') || value.startsWith('/member/register') || value.startsWith('/member/forgot')) {
    return fallback
  }
  return value
}

/** 拉取图形验证码；失败不阻断登录流程，由后端再次要求时重试 */
async function loadCaptcha() {
  try {
    const res = await fetchCaptcha()
    if (res.code === REAL_API_SUCCESS_CODE && res.data) {
      captcha.value = res.data
      form.captcha = ''
    }
  } catch {
    captcha.value = null
  }
}

/** 提交前的本地必填校验，返回错误文案（无错误返回空串） */
function validate(): string {
  if (!/^1\d{10}$/.test(form.phone.trim())) return '请输入正确的手机号'
  if (method.value === 'password' && !form.password) return '请输入密码'
  if (method.value === 'smsCode' && !form.smsCode.trim()) return '请输入短信验证码'
  if (captcha.value && !form.captcha.trim()) return '请填写图形验证码'
  return ''
}

/**
 * 登录
 * 后端凭证错误返回 code 401 且 data 带 captchaRequired，
 * 据此决定是否补显图形验证码；文案统一由后端给，前端不区分账号/密码错误
 */
async function onSubmit() {
  const invalid = validate()
  if (invalid) { errorText.value = invalid; return }

  submitting.value = true
  errorText.value = ''
  try {
    const res = await login({
      phone: form.phone.trim(),
      method: method.value,
      password: method.value === 'password' ? form.password : undefined,
      smsCode: method.value === 'smsCode' ? form.smsCode.trim() : undefined,
      captcha: captcha.value ? form.captcha.trim() : undefined,
      captchaId: captcha.value?.captchaId,
    })
    if (res.code === REAL_API_SUCCESS_CODE && isAuthSuccess(res.data)) {
      memberStore.setAuth(res.data.token, res.data.profile)
      await router.replace(safeRedirect(route.query.redirect))
      return
    }
    errorText.value = res.message || '登录失败，请检查手机号与密码'
    if (res.data?.captchaRequired) await loadCaptcha()
    else if (captcha.value) await loadCaptcha()
  } catch {
    errorText.value = '网络异常，请稍后重试'
  } finally {
    submitting.value = false
  }
}
onMounted(async () => {
  // 已登录的拦截在路由守卫（meta.guestOnly）完成，此处只拉配置
  try {
    const res = await fetchAuthConfig()
    if (res.code === REAL_API_SUCCESS_CODE && res.data) {
      config.value = res.data
      // 密码登录被后台关闭时，落到可用的第一种方式
      if (!res.data.allowPasswordLogin && res.data.allowSmsLogin) method.value = 'smsCode'
    }
  } catch {
    errorText.value = '登录配置加载失败，请刷新页面重试'
  }
})
</script>
<style scoped>
.auth-alert {
  margin-bottom: 16px;
}

.auth-tabs {
  margin-top: 8px;
}

/* 输入框与右侧按钮同行，按钮宽度自适应文案 */
.field-inline {
  display: flex;
  gap: 10px;
  width: 100%;
}

.field-inline :deep(.el-input) {
  flex: 1;
}

/* 算术题面点击可换一题，用等宽字体避免字符跳动 */
.captcha-question {
  min-width: 96px;
  padding: 0 12px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 15px;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
}

.auth-submit {
  width: 100%;
  margin-top: 8px;
}

.auth-links {
  margin-top: 14px;
  font-size: 13px;
  text-align: right;
}

.auth-links a {
  color: #64748b;
  text-decoration: none;
}

.auth-links a:hover {
  color: var(--brand-primary, #0ea5e9);
}
</style>
