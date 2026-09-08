<template>
  <AuthShell title="注册会员" subtitle="注册后可提交反馈并查看回复">
    <el-alert v-if="errorText" type="error" :closable="false" show-icon class="auth-alert">
      {{ errorText }}
    </el-alert>
    <el-alert v-if="tipText" type="success" :closable="false" show-icon class="auth-alert">
      {{ tipText }}
    </el-alert>

    <el-form v-if="registerOpen" label-position="top" @submit.prevent="onSubmit">
      <el-form-item label="手机号">
        <el-input v-model="form.phone" maxlength="11" placeholder="请输入手机号" />
      </el-form-item>

      <el-form-item label="短信验证码">
        <div class="field-inline">
          <el-input v-model="form.smsCode" maxlength="6" placeholder="请输入验证码" />
          <SmsCodeButton
            :phone="form.phone"
            purpose="register"
            @sent="tipText = '验证码已发送，请注意查收'"
            @fail="onSmsFail"
          />
        </div>
      </el-form-item>

      <el-form-item label="昵称">
        <el-input v-model="form.nickname" maxlength="20" placeholder="请输入昵称" />
      </el-form-item>

      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" show-password :placeholder="pwdPlaceholder" />
      </el-form-item>

      <el-form-item label="确认密码">
        <el-input v-model="form.confirm" type="password" show-password placeholder="请再次输入密码" />
      </el-form-item>

      <el-form-item label="邮箱（选填）">
        <el-input v-model="form.email" maxlength="60" placeholder="用于接收反馈通知" />
      </el-form-item>

      <el-button type="primary" class="auth-submit" :loading="submitting" @click="onSubmit">
        注册并登录
      </el-button>
    </el-form>

    <el-alert v-else-if="config" type="warning" :closable="false" show-icon>
      当前暂未开放注册，如需开通账号请联系管理员。
    </el-alert>

    <template #foot>
      已有账号？<RouterLink to="/member/login">直接登录</RouterLink>
    </template>
  </AuthShell>
</template>
<script setup lang="ts">
// 会员注册页：短信验证码 + 密码，密码强度要求随后台配置变化
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from './AuthShell.vue'
import SmsCodeButton from './SmsCodeButton.vue'
import { fetchAuthConfig, register, isAuthSuccess, type PortalAuthConfig } from '@/api/memberAuth'
import { useMemberStore } from '@/stores/member'
import { REAL_API_SUCCESS_CODE } from '@/config'

const router = useRouter()
const memberStore = useMemberStore()

const config = ref<PortalAuthConfig | null>(null)
const submitting = ref(false)
const errorText = ref('')
const tipText = ref('')

const form = reactive({
  phone: '', smsCode: '', nickname: '', password: '', confirm: '', email: '',
})

// 配置未回来前先允许填写，提交时由后端把关
const registerOpen = computed(() => config.value?.registerOpen !== false)
/** 密码最小长度取后台配置，未取到时按后端默认值 8 */
const minLength = computed(() => config.value?.passwordMinLength ?? 8)
const requireMixed = computed(() => config.value?.passwordRequireMixed !== false)

const pwdPlaceholder = computed(() =>
  requireMixed.value
    ? `至少 ${minLength.value} 位，需含字母与数字`
    : `至少 ${minLength.value} 位`,
)

/** 发送失败时清掉成功提示，避免两条提示同时存在 */
function onSmsFail(msg: string) {
  tipText.value = ''
  errorText.value = msg
}
/**
 * 提交前本地校验，规则与后端 validatePassword 一致
 * @returns 不合规时返回中文提示，合规返回空串
 */
function validate(): string {
  if (!/^1\d{10}$/.test(form.phone.trim())) return '请输入正确的手机号'
  if (!form.smsCode.trim()) return '请输入短信验证码'
  if (!form.nickname.trim()) return '请输入昵称'
  if (form.password.length < minLength.value) return `密码长度不得少于 ${minLength.value} 位`
  if (requireMixed.value && !(/[A-Za-z]/.test(form.password) && /\d/.test(form.password))) {
    return '密码需同时包含字母与数字'
  }
  if (form.password !== form.confirm) return '两次输入的密码不一致'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return '请输入正确的邮箱地址'
  }
  return ''
}

/** 注册成功后端直接下发令牌，无需再走一次登录 */
async function onSubmit() {
  const invalid = validate()
  if (invalid) { tipText.value = ''; errorText.value = invalid; return }

  submitting.value = true
  errorText.value = ''
  try {
    const res = await register({
      phone: form.phone.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
      smsCode: form.smsCode.trim(),
      email: form.email.trim() || undefined,
    })
    if (res.code === REAL_API_SUCCESS_CODE && isAuthSuccess(res.data)) {
      memberStore.setAuth(res.data.token, res.data.profile)
      await router.replace('/member/center')
      return
    }
    tipText.value = ''
    errorText.value = res.message || '注册失败，请稍后重试'
  } catch {
    tipText.value = ''
    errorText.value = '网络异常，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  // 已登录的拦截在路由守卫（meta.guestOnly）完成，此处只拉配置
  try {
    const res = await fetchAuthConfig()
    if (res.code === REAL_API_SUCCESS_CODE && res.data) config.value = res.data
  } catch {
    errorText.value = '注册配置加载失败，请刷新页面重试'
  }
})
</script>
<style scoped>
.auth-alert {
  margin-bottom: 16px;
}

/* 输入框与验证码按钮同行 */
.field-inline {
  display: flex;
  gap: 10px;
  width: 100%;
}

.field-inline :deep(.el-input) {
  flex: 1;
}

.auth-submit {
  width: 100%;
  margin-top: 8px;
}
</style>
