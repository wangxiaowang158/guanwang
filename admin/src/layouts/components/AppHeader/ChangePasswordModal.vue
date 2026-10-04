<template>
  <!-- 当前管理员自助修改密码：改成功后强制重新登录 -->
  <a-modal
    :open="open"
    title="修改密码"
    width="440px"
    :confirm-loading="saving"
    ok-text="确认修改"
    cancel-text="取消"
    @ok="onSubmit"
    @cancel="onCancel"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :label-col="{ style: { width: '82px' } }"
      style="margin-top: 8px"
    >
      <a-form-item label="原密码" name="oldPassword">
        <a-input-password v-model:value="form.oldPassword" :maxlength="100" placeholder="请输入原密码" />
      </a-form-item>
      <a-form-item label="新密码" name="newPassword">
        <a-input-password v-model:value="form.newPassword" :maxlength="100" placeholder="不少于 8 位" />
      </a-form-item>
      <a-form-item label="确认密码" name="confirmPassword">
        <a-input-password v-model:value="form.confirmPassword" :maxlength="100" placeholder="请再次输入新密码" />
      </a-form-item>
    </a-form>
    <!-- 提前告知会被登出，避免用户以为是改密失败 -->
    <p class="hint">修改成功后当前登录将失效，需用新密码重新登录。</p>
  </a-modal>
</template>

<script setup lang="ts">
// 管理员自助改密弹窗：校验通过后调 /api/mgmt/auth/password，成功即清凭证回登录页
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { changeOwnPassword } from '@/api/auth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  /** 关闭弹窗（取消或改密成功） */
  (e: 'update:open', value: boolean): void
  /** 改密成功，由父级负责清凭证与跳转 */
  (e: 'success'): void
}>()

const formRef = ref<FormInstance>()
const saving = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

/** 新密码不得与原密码相同：后端不拦，这里挡住无意义的改密 */
const validateNew = async (_rule: Rule, value: string): Promise<void> => {
  if (value && value === form.oldPassword) {
    return Promise.reject('新密码不能与原密码相同')
  }
  return Promise.resolve()
}

/** 两次输入需一致 */
const validateConfirm = async (_rule: Rule, value: string): Promise<void> => {
  if (value !== form.newPassword) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

// 长度下限与后端 ChangeOwnPasswordDto 的 8 位保持一致，后端为准
const rules: Record<string, Rule[]> = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    { min: 8, message: '新密码不得少于 8 位' },
    { validator: validateNew },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码' },
    { validator: validateConfirm },
  ],
}

// 关闭时清空，避免下次打开残留上一次的输入
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      formRef.value?.resetFields()
      form.oldPassword = ''
      form.newPassword = ''
      form.confirmPassword = ''
    }
  }
)

const onCancel = () => {
  emit('update:open', false)
}

/** 提交改密：原密码错误等业务失败后端返回 code 400，按后端文案提示 */
const onSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    // 校验未通过，错误已由表单项展示
    return
  }

  saving.value = true
  try {
    const { data } = await changeOwnPassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    })
    if (data.code !== 200) {
      message.error(data.message || '密码修改失败')
      return
    }
    message.success('密码修改成功，请重新登录')
    emit('update:open', false)
    emit('success')
  } catch {
    message.error('密码修改失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.hint {
  margin: 0;
  padding-left: 82px; /* 与表单 label 宽度对齐，视觉上归属表单而非弹窗底部 */
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.6;
}
</style>
