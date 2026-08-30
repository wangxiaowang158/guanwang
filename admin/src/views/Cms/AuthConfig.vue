<template>
  <div class="auth-config">
    <div class="page-title">注册登录配置</div>

    <a-spin :spinning="loading">
      <a-form :model="form" :label-col="{ style: { width: '160px' } }" class="config-form">
        <a-divider orientation="left">注册</a-divider>
        <a-form-item label="开放注册">
          <a-switch v-model:checked="form.registerOpen" />
          <span class="hint">关闭后前台注册入口不可用，已注册会员不受影响</span>
        </a-form-item>

        <a-divider orientation="left">登录方式</a-divider>
        <a-form-item label="允许密码登录">
          <a-switch v-model:checked="form.allowPasswordLogin" />
        </a-form-item>
        <a-form-item label="允许短信登录">
          <a-switch v-model:checked="form.allowSmsLogin" />
          <span v-if="!form.allowPasswordLogin && !form.allowSmsLogin" class="hint danger">
            两种登录方式不可同时关闭
          </span>
        </a-form-item>
        <a-divider orientation="left">密码强度</a-divider>
        <a-form-item label="密码最小长度">
          <a-input-number v-model:value="form.passwordMinLength" :min="6" :max="50" :precision="0" />
          <span class="hint">6-50 位；调整后仅对新设置的密码生效</span>
        </a-form-item>
        <a-form-item label="必须字母数字混合">
          <a-switch v-model:checked="form.passwordRequireMixed" />
        </a-form-item>
        <a-divider orientation="left">登录风控</a-divider>
        <a-form-item label="验证码触发次数">
          <a-input-number v-model:value="form.captchaThreshold" :min="1" :max="20" :precision="0" />
          <span class="hint">连续登录失败达到该次数后要求填写图形验证码</span>
        </a-form-item>
        <a-form-item label="锁定触发次数">
          <a-input-number v-model:value="form.lockThreshold" :min="1" :max="20" :precision="0" />
          <span class="hint">1-20 次；达到后临时锁定账号</span>
        </a-form-item>
        <a-form-item label="锁定时长">
          <a-input-number v-model:value="form.lockMinutes" :min="1" :max="1440" :precision="0" />
          <span class="hint">分钟，最长 1440（24 小时）；后台可对单个会员提前解锁</span>
        </a-form-item>
        <div class="form-foot">
          <a-space>
            <a-button :disabled="saving" @click="load">重置</a-button>
            <a-button type="primary" :loading="saving" @click="onSave">保存</a-button>
          </a-space>
        </div>
      </a-form>
    </a-spin>
  </div>
</template>
<script setup lang="ts">
// 注册登录配置：持久化单例，读写整份配置，无新增与删除
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getAuthConfig, updateAuthConfig, type AuthConfig } from '@/api/authConfig'
import { LIST_LOAD_FAILED, SAVE_SUCCESS, SAVE_FAILED } from '@/constants/ui'

/** 表单默认值：与后端实体默认值保持一致，仅在接口返回前短暂使用 */
const form = reactive<AuthConfig>({
  registerOpen: true,
  allowPasswordLogin: true,
  allowSmsLogin: false,
  passwordMinLength: 8,
  passwordRequireMixed: true,
  captchaThreshold: 3,
  lockThreshold: 5,
  lockMinutes: 30,
})

const loading = ref(false)
const saving = ref(false)

/** 读取配置；失败时保留当前表单值并提示 */
const load = async () => {
  loading.value = true
  try {
    const res = await getAuthConfig()
    if (res.data.code === 200 && res.data.data) {
      Object.assign(form, res.data.data)
    } else {
      message.error(res.data.message || LIST_LOAD_FAILED)
    }
  } catch {
    message.error(LIST_LOAD_FAILED)
  } finally {
    loading.value = false
  }
}
/**
 * 保存配置
 * 数值范围由 a-input-number 的 min/max 与后端 DTO 双重约束；
 * 此处只拦截后端无法表达的跨字段规则（两种登录方式不能同时关闭）
 */
const onSave = async () => {
  if (!form.allowPasswordLogin && !form.allowSmsLogin) {
    message.warning('密码登录与短信登录不可同时关闭')
    return
  }
  saving.value = true
  try {
    const res = await updateAuthConfig({ ...form })
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    // 后端会回写规范化后的配置，以其为准刷新表单
    if (res.data.data) Object.assign(form, res.data.data)
    message.success(SAVE_SUCCESS)
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
<style scoped>
.page-title {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
}

/* 配置项少，限宽避免控件在宽屏上被拉散 */
.config-form {
  max-width: 720px;
}

.hint {
  margin-left: 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.hint.danger {
  color: #cf1322;
}

/* 底部操作按钮右对齐，与其他编辑页一致 */
.form-foot {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}
</style>
