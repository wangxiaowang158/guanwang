<template>
  <AuthShell title="重置密码" subtitle="通过手机验证码设置新密码">
    <el-alert v-if="errorText" type="error" :closable="false" show-icon class="auth-alert">
      {{ errorText }}
    </el-alert>
    <el-alert v-if="tipText" type="success" :closable="false" show-icon class="auth-alert">
      {{ tipText }}
    </el-alert>

    <el-form label-position="top" @submit.prevent="onSubmit">
      <el-form-item label="手机号">
        <el-input v-model="form.phone" maxlength="11" placeholder="请输入注册手机号" />
      </el-form-item>

      <el-form-item label="短信验证码">
        <div class="field-inline">
          <el-input v-model="form.smsCode" maxlength="6" placeholder="请输入验证码" />
          <SmsCodeButton
            :phone="form.phone"
            purpose="reset"
            @sent="onSmsSent"
            @fail="onSmsFail"
          />
        </div>
      </el-form-item>

      <el-form-item label="新密码">
        <el-input v-model="form.password" type="password" show-password :placeholder="pwdPlaceholder" />
      </el-form-item>

      <el-form-item label="确认新密码">
        <el-input v-model="form.confirm" type="password" show-password placeholder="请再次输入新密码" />
      </el-form-item>

      <el-button type="primary" class="auth-submit" :loading="submitting" @click="onSubmit">
        重置密码
      </el-button>
    </el-form>

    <template #foot>
      想起来了？<RouterLink to="/member/login">返回登录</RouterLink>
    </template>
  </AuthShell>
</template>
<script setup lang="ts">
// 重置密码页：手机验证码校验后设置新密码，成功后回登录页
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from './AuthShell.vue'
import SmsCodeButton from './SmsCodeButton.vue'
import { fetchAuthConfig, resetPassword, type PortalAuthConfig } from '@/api/memberAuth'
import { REAL_API_SUCCESS_CODE } from '@/config'

const router = useRouter()

const config = ref<PortalAuthConfig | null>(null)
const submitting = ref(false)
const errorText = ref('')
const tipText = ref('')

const form = reactive({ phone: '', smsCode: '', password: '', confirm: '' })

/** 密码规则取后台配置，未取到时按后端默认值 */
const minLength = computed(() => config.value?.passwordMinLength ?? 8)
const requireMixed = computed(() => config.value?.passwordRequireMixed !== false)

const pwdPlaceholder = computed(() =>
  requireMixed.value
    ? `至少 ${minLength.value} 位，需含字母与数字`
    : `至少 ${minLength.value} 位`,
)

function onSmsSent() {
  errorText.value = ''
  tipText.value = '验证码已发送，请注意查收'
}

function onSmsFail(msg: string) {
  tipText.value = ''
  errorText.value = msg
}
/**
 * 提交前本地校验，密码规则与后端 validatePassword 一致
 * @returns 不合规时返回中文提示，合规返回空串
 */
function validate(): string {
  if (!/^1\d{10}$/.test(form.phone.trim())) return '请输入正确的手机号'
  if (!form.smsCode.trim()) return '请输入短信验证码'
  if (form.password.length < minLength.value) return `密码长度不得少于 ${minLength.value} 位`
  if (requireMixed.value && !(/[A-Za-z]/.test(form.password) && /\d/.test(form.password))) {
    return '密码需同时包含字母与数字'
  }
  if (form.password !== form.confirm) return '两次输入的密码不一致'
  return ''
}

/**
 * 重置密码
 * 未注册号码后端同样返回成功（防账号枚举），故成功提示措辞保持中立
 */
async function onSubmit() {
  const invalid = validate()
  if (invalid) { tipText.value = ''; errorText.value = invalid; return }

  submitting.value = true
  errorText.value = ''
  try {
    const res = await resetPassword({
      phone: form.phone.trim(),
      smsCode: form.smsCode.trim(),
      newPassword: form.password,
    })
    if (res.code !== REAL_API_SUCCESS_CODE) {
      tipText.value = ''
      errorText.value = res.message || '重置失败，请确认验证码是否正确'
      return
    }
    tipText.value = '密码已重置，正在返回登录页'
    // 留出提示可读时间再跳转
    setTimeout(() => { void router.replace('/member/login') }, 1200)
  } catch {
    tipText.value = ''
    errorText.value = '网络异常，请稍后重试'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const res = await fetchAuthConfig()
    if (res.code === REAL_API_SUCCESS_CODE && res.data) config.value = res.data
  } catch {
    // 配置拉取失败按后端默认密码规则校验，不阻断流程
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
