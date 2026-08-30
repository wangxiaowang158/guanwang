<template>
  <!-- 短信验证码发送按钮：内置 60 秒倒计时，注册/登录/找回密码三处复用 -->
  <el-button
    :disabled="counting || sending || !phoneValid"
    :loading="sending"
    @click="onSend"
  >
    {{ counting ? `${seconds}s 后重发` : '获取验证码' }}
  </el-button>
</template>

<script setup lang="ts">
// 短信验证码按钮：校验手机号 → 调发送接口 → 进入倒计时
import { computed, onUnmounted, ref } from 'vue'
import { sendSmsCode, type SmsPurpose } from '@/api/memberAuth'
import { REAL_API_SUCCESS_CODE } from '@/config'

const props = defineProps<{
  phone: string
  purpose: SmsPurpose
}>()

const emit = defineEmits<{
  sent: []
  fail: [message: string]
}>()

/** 倒计时秒数，与后端发送频率限制（60 秒）对齐 */
const COUNTDOWN = 60

const sending = ref(false)
const seconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const counting = computed(() => seconds.value > 0)
// 中国大陆手机号：1 开头 11 位
const phoneValid = computed(() => /^1\d{10}$/.test(props.phone.trim()))

/** 启动倒计时，归零时自行清理定时器 */
function startCountdown() {
  seconds.value = COUNTDOWN
  timer = setInterval(() => {
    seconds.value -= 1
    if (seconds.value <= 0) stopCountdown()
  }, 1000)
}

function stopCountdown() {
  if (timer) clearInterval(timer)
  timer = null
  seconds.value = 0
}
/**
 * 发送验证码
 * 失败不进入倒计时，让用户可立即重试；错误文案交由父组件统一展示
 */
async function onSend() {
  if (sending.value || counting.value || !phoneValid.value) return
  sending.value = true
  try {
    const res = await sendSmsCode(props.phone.trim(), props.purpose)
    if (res.code !== REAL_API_SUCCESS_CODE) {
      emit('fail', res.message || '验证码发送失败，请稍后重试')
      return
    }
    startCountdown()
    emit('sent')
  } catch {
    emit('fail', '网络异常，验证码发送失败')
  } finally {
    sending.value = false
  }
}

// 组件卸载时清理定时器，避免离开页面后仍在计时
onUnmounted(stopCountdown)
</script>
