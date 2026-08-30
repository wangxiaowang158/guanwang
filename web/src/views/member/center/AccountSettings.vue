<template>
  <!-- 账号设置：资料编辑与修改密码两块独立提交 -->
  <div class="as">
    <el-alert v-if="errorText" type="error" :closable="false" show-icon class="as-alert">
      {{ errorText }}
    </el-alert>
    <el-alert v-if="tipText" type="success" :closable="false" show-icon class="as-alert">
      {{ tipText }}
    </el-alert>

    <section class="as-block">
      <h3 class="as-title">基本资料</h3>
      <el-form label-position="top" @submit.prevent="onSaveProfile">
        <el-form-item label="手机号">
          <el-input :model-value="profile?.phone || ''" disabled />
          <span class="as-hint">手机号为登录账号，暂不支持修改</span>
        </el-form-item>

        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" maxlength="20" placeholder="2-20 字" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="profileForm.email" maxlength="100" placeholder="用于接收反馈通知" />
        </el-form-item>

        <div class="as-foot">
          <el-button type="primary" :loading="savingProfile" @click="onSaveProfile">
            保存资料
          </el-button>
        </div>
      </el-form>
    </section>

    <section class="as-block">
      <h3 class="as-title">修改密码</h3>
      <el-form label-position="top" @submit.prevent="onChangePassword">
        <el-form-item label="当前密码">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入当前密码" />
        </el-form-item>

        <el-form-item label="新密码">
          <el-input v-model="pwdForm.newPassword" type="password" show-password :placeholder="pwdPlaceholder" />
        </el-form-item>

        <el-form-item label="确认新密码">
          <el-input v-model="pwdForm.confirm" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>

        <div class="as-foot">
          <el-button type="primary" :loading="savingPwd" @click="onChangePassword">
            修改密码
          </el-button>
        </div>
      </el-form>
    </section>
  </div>
</template>
<script setup lang="ts">
// 账号设置：基本资料与密码分别提交，密码强度规则取自后台配置
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { changePassword, updateProfile } from '@/api/member'
import { fetchAuthConfig, type PortalAuthConfig } from '@/api/memberAuth'
import { useMemberStore } from '@/stores/member'
import { REAL_API_SUCCESS_CODE } from '@/config'

const memberStore = useMemberStore()

const config = ref<PortalAuthConfig | null>(null)
const savingProfile = ref(false)
const savingPwd = ref(false)
const errorText = ref('')
const tipText = ref('')

const profile = computed(() => memberStore.profile)
const profileForm = reactive({ nickname: '', email: '' })
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirm: '' })

/** 密码规则取后台配置，未取到时按后端默认值 */
const minLength = computed(() => config.value?.passwordMinLength ?? 8)
const requireMixed = computed(() => config.value?.passwordRequireMixed !== false)

const pwdPlaceholder = computed(() =>
  requireMixed.value
    ? `至少 ${minLength.value} 位，需含字母与数字`
    : `至少 ${minLength.value} 位`,
)

// 资料可能在本组件挂载后才由 store 恢复完成，故用 watch 回填而非只在 onMounted 读一次
watch(
  profile,
  (value) => {
    if (!value) return
    profileForm.nickname = value.nickname
    profileForm.email = value.email || ''
  },
  { immediate: true },
)
/** 保存基本资料；成功后用后端回写的资料刷新 store */
async function onSaveProfile() {
  const nickname = profileForm.nickname.trim()
  const email = profileForm.email.trim()
  if (nickname.length < 2 || nickname.length > 20) {
    tipText.value = ''
    errorText.value = '昵称长度需为 2-20 字'
    return
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    tipText.value = ''
    errorText.value = '请输入正确的邮箱地址'
    return
  }

  savingProfile.value = true
  errorText.value = ''
  try {
    const res = await updateProfile({ nickname, email })
    if (res.code !== REAL_API_SUCCESS_CODE || !res.data) {
      tipText.value = ''
      errorText.value = res.message || '保存失败，请稍后重试'
      return
    }
    memberStore.setProfile(res.data)
    tipText.value = '资料已保存'
  } catch {
    tipText.value = ''
    errorText.value = '网络异常，请稍后重试'
  } finally {
    savingProfile.value = false
  }
}
/** 修改密码；校验规则与后端 validatePassword 一致 */
async function onChangePassword() {
  if (!pwdForm.oldPassword) {
    tipText.value = ''
    errorText.value = '请输入当前密码'
    return
  }
  if (pwdForm.newPassword.length < minLength.value) {
    tipText.value = ''
    errorText.value = `密码长度不得少于 ${minLength.value} 位`
    return
  }
  if (requireMixed.value && !(/[A-Za-z]/.test(pwdForm.newPassword) && /\d/.test(pwdForm.newPassword))) {
    tipText.value = ''
    errorText.value = '密码需同时包含字母与数字'
    return
  }
  if (pwdForm.newPassword !== pwdForm.confirm) {
    tipText.value = ''
    errorText.value = '两次输入的新密码不一致'
    return
  }

  savingPwd.value = true
  errorText.value = ''
  try {
    const res = await changePassword({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })
    if (res.code !== REAL_API_SUCCESS_CODE) {
      tipText.value = ''
      errorText.value = res.message || '修改失败，请确认当前密码是否正确'
      return
    }
    tipText.value = res.message || '密码已修改'
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirm = ''
  } catch {
    tipText.value = ''
    errorText.value = '网络异常，请稍后重试'
  } finally {
    savingPwd.value = false
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
.as-alert {
  margin-bottom: 16px;
}

.as-block {
  max-width: 460px;
}

/* 两块之间用分隔线区隔，避免视觉粘连 */
.as-block + .as-block {
  margin-top: 32px;
  padding-top: 28px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.as-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.as-hint {
  font-size: 12px;
  color: #94a3b8;
}

/* 表单底部操作按钮右对齐 */
.as-foot {
  display: flex;
  justify-content: flex-end;
}
</style>
