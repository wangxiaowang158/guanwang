<template>
  <!-- 会员提交反馈：身份取自令牌，只需填分类与内容 -->
  <div class="ff">
    <el-alert v-if="errorText" type="error" :closable="false" show-icon class="ff-alert">
      {{ errorText }}
    </el-alert>
    <el-alert v-if="tipText" type="success" :closable="false" show-icon class="ff-alert">
      {{ tipText }}
    </el-alert>

    <el-form label-position="top" @submit.prevent="onSubmit">
      <el-form-item label="反馈分类">
        <el-select v-model="form.feedbackType" placeholder="请选择分类" class="ff-select">
          <el-option
            v-for="opt in typeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="反馈内容">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="5"
          maxlength="2000"
          show-word-limit
          resize="none"
          placeholder="请描述您遇到的问题或建议"
        />
      </el-form-item>

      <el-form-item label="联系电话（选填）">
        <el-input v-model="form.phone" maxlength="11" placeholder="留空则使用注册手机号" />
      </el-form-item>

      <div class="ff-foot">
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交反馈</el-button>
      </div>
    </el-form>
  </div>
</template>
<script setup lang="ts">
// 会员反馈提交表单：提交成功后通知父组件刷新「我的反馈」
import { reactive, ref } from 'vue'
import {
  submitMemberFeedback, FEEDBACK_TYPE_LABEL, type FeedbackType,
} from '@/api/feedback'
import { REAL_API_SUCCESS_CODE } from '@/config'

const emit = defineEmits<{ submitted: [] }>()

const submitting = ref(false)
const errorText = ref('')
const tipText = ref('')

const form = reactive<{ feedbackType: FeedbackType; content: string; phone: string }>({
  feedbackType: 'suggestion',
  content: '',
  phone: '',
})

/** 分类下拉选项 */
const typeOptions = (Object.keys(FEEDBACK_TYPE_LABEL) as FeedbackType[]).map((value) => ({
  value,
  label: FEEDBACK_TYPE_LABEL[value],
}))

/**
 * 提交反馈
 * 手机号规则与后端 PHONE_PATTERN 一致；留空则由后端取账号手机号
 */
async function onSubmit() {
  const content = form.content.trim()
  const phone = form.phone.trim()
  if (!content) { tipText.value = ''; errorText.value = '请填写反馈内容'; return }
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    tipText.value = ''
    errorText.value = '请输入正确的手机号，或留空使用注册手机号'
    return
  }

  submitting.value = true
  errorText.value = ''
  try {
    const res = await submitMemberFeedback({
      feedbackType: form.feedbackType,
      content,
      phone: phone || undefined,
      sourcePage: '会员中心-提交反馈',
    })
    if (res.code !== REAL_API_SUCCESS_CODE) {
      tipText.value = ''
      errorText.value = res.message || '提交失败，请稍后重试'
      return
    }
    tipText.value = '反馈已提交，我们会尽快处理'
    form.content = ''
    form.phone = ''
    emit('submitted')
  } catch {
    tipText.value = ''
    errorText.value = '网络异常，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>
<style scoped>
.ff-alert {
  margin-bottom: 16px;
}

.ff-select {
  width: 200px;
}

/* 表单底部操作按钮右对齐 */
.ff-foot {
  display: flex;
  justify-content: flex-end;
}
</style>
