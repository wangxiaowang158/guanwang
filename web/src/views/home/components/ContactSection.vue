<template>
  <!-- 联系我们：左侧联系信息，右侧在线留言表单 -->
  <div class="grid grid-cols-1 lg:grid-cols-5 gap-10">
    <!-- 联系信息 -->
    <div class="lg:col-span-2 space-y-4">
      <div v-for="info in contactItems" :key="info.label" class="flex items-start gap-4 p-5 rounded-2xl border border-gray-100">
        <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="info.icon" />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-900 mb-0.5">{{ info.label }}</div>
          <div class="text-sm text-gray-400 break-all">{{ info.value || '暂无' }}</div>
        </div>
      </div>
    </div>

    <!-- 在线留言表单 -->
    <div class="lg:col-span-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <h3 class="text-lg font-bold text-gray-900 mb-6">在线留言</h3>
        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1.5">姓名 <span class="text-red-400">*</span></label>
              <input
                v-model="form.name"
                type="text"
                maxlength="20"
                placeholder="请输入您的姓名"
                class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                :class="errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                @blur="validate('name')"
              />
              <p v-if="errors.name" class="text-xs text-red-400 mt-1">{{ errors.name }}</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1.5">手机号 <span class="text-red-400">*</span></label>
              <input
                v-model="form.phone"
                type="tel"
                maxlength="11"
                placeholder="请输入手机号"
                class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all"
                :class="errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
                @blur="validate('phone')"
              />
              <p v-if="errors.phone" class="text-xs text-red-400 mt-1">{{ errors.phone }}</p>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1.5">留言内容 <span class="text-red-400">*</span></label>
            <textarea
              v-model="form.content"
              rows="5"
              maxlength="500"
              placeholder="请描述您的需求或咨询内容..."
              class="w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-300 outline-none transition-all resize-none"
              :class="errors.content ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'"
              @blur="validate('content')"
            ></textarea>
            <p v-if="errors.content" class="text-xs text-red-400 mt-1">{{ errors.content }}</p>
          </div>
          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ submitting ? '提交中...' : '提交留言' }}
          </button>
          <p v-if="sent" class="text-center text-sm text-green-600 font-medium">✓ 留言已提交，我们会尽快与您联系！</p>
          <p v-if="submitError" class="text-center text-sm text-red-500 font-medium">提交失败，请稍后重试或直接致电我们</p>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
// 联系信息展示 + 在线留言提交（姓名/电话/留言内容），提交进 admin 留言管理
import { reactive, ref, computed } from 'vue'
import type { SiteInfo } from '@/api/home'
import { submitAnonymousFeedback, submitMemberFeedback } from '@/api/feedback'
import { useMemberStore } from '@/stores/member'
import { REAL_API_SUCCESS_CODE } from '@/config'

const memberStore = useMemberStore()

const props = defineProps<{ site: Partial<SiteInfo> }>()

const contactItems = computed(() => [
  { label: '联系电话', value: props.site.phone, icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z' },
  { label: '公司邮箱', value: props.site.contactEmail, icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
  { label: '公司地址', value: props.site.address, icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z' },
])

const submitting = ref(false)
const sent = ref(false)
const submitError = ref(false)
const form = reactive({ name: '', phone: '', content: '' })
const errors = reactive({ name: '', phone: '', content: '' })

// 单字段校验：姓名/留言必填，电话校验中国手机或座机格式
function validate(field: keyof typeof form) {
  if (field === 'name') {
    errors.name = form.name.trim() ? '' : '请输入姓名'
  } else if (field === 'phone') {
    // 后端反馈接口只接受中国大陆手机号，故不再放行座机
    if (!form.phone.trim()) errors.phone = '请输入手机号'
    else if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) errors.phone = '请输入有效的手机号'
    else errors.phone = ''
  } else if (field === 'content') {
    errors.content = form.content.trim() ? '' : '请输入留言内容'
  }
}

/**
 * 提交留言
 * 已登录会员走会员反馈接口（可在会员中心查看回复），
 * 未登录走匿名反馈接口；两者均入后台「意见反馈」
 */
async function handleSubmit() {
  ;(['name', 'phone', 'content'] as const).forEach(validate)
  if (Object.values(errors).some(Boolean)) return
  submitting.value = true
  submitError.value = false
  try {
    const phone = form.phone.trim()
    const content = form.content.trim()
    const res = memberStore.isLoggedIn
      ? await submitMemberFeedback({
          content,
          // 座机号不合后端手机号规则，此时不传，由后端取账号手机号
          phone: /^1[3-9]\d{9}$/.test(phone) ? phone : undefined,
          sourcePage: '首页-联系我们',
        })
      : await submitAnonymousFeedback({
          name: form.name.trim(),
          phone,
          content,
          sourcePage: '首页-联系我们',
        })
    if (res.code === REAL_API_SUCCESS_CODE) {
      sent.value = true
      form.name = ''
      form.phone = ''
      form.content = ''
      setTimeout(() => (sent.value = false), 4000)
    } else {
      submitError.value = true
      setTimeout(() => (submitError.value = false), 4000)
    }
  } catch {
    // 提交失败：提示用户重试，保留已填内容
    submitError.value = true
    setTimeout(() => (submitError.value = false), 4000)
  } finally {
    submitting.value = false
  }
}
</script>