<template>
  <!-- 联系我们：左侧联系方式，右侧在线留言表单（SRS 3.5.2） -->
  <div class="cs" :class="{ 'cs--style2': theme.isStyle2 }">
    <ul class="cs-info">
      <li v-for="info in contactItems" :key="info.label" class="cs-info-item">
        <span class="cs-info-icon" aria-hidden="true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="info.icon" /></svg>
        </span>
        <div class="min-w-0">
          <p class="cs-info-label">{{ info.label }}</p>
          <a v-if="info.href" :href="info.href" :target="info.external ? '_blank' : undefined" :rel="info.external ? 'noopener noreferrer' : undefined" class="cs-info-value cs-info-value--link">{{ info.value }}</a>
          <p v-else class="cs-info-value">{{ info.value }}</p>
        </div>
      </li>
      <li v-if="site.wechatQr" class="cs-info-item">
        <img :src="site.wechatQr" alt="微信公众号二维码" class="w-24 h-24 object-contain bg-white border border-line p-1" width="96" height="96" loading="lazy" />
        <p class="cs-info-label self-center">微信扫码咨询</p>
      </li>
    </ul>

    <div class="cs-form-card">
      <h3 class="cs-form-title">在线留言</h3>
      <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="cs-name" class="cs-label">姓名 <span v-if="!memberStore.isLoggedIn" class="cs-req" aria-hidden="true">*</span></label>
            <!-- 已登录时以会员身份提交，姓名取账号昵称，故只读展示 -->
            <input v-if="memberStore.isLoggedIn" id="cs-name" :value="memberStore.displayName" type="text" readonly class="cs-input cs-input--readonly" />
            <template v-else>
              <input
                id="cs-name"
                v-model="form.name"
                type="text"
                maxlength="20"
                autocomplete="name"
                placeholder="请输入您的姓名"
                class="cs-input"
                :class="{ 'is-error': errors.name }"
                :aria-invalid="!!errors.name"
                :aria-describedby="errors.name ? 'cs-name-err' : undefined"
                aria-required="true"
                @blur="validate('name')"
              />
              <p v-if="errors.name" id="cs-name-err" class="cs-err">{{ errors.name }}</p>
            </template>
          </div>
          <div>
            <label for="cs-phone" class="cs-label">手机号 <span class="cs-req" aria-hidden="true">*</span></label>
            <input
              id="cs-phone"
              v-model="form.phone"
              type="tel"
              inputmode="numeric"
              maxlength="11"
              autocomplete="tel"
              placeholder="请输入手机号"
              class="cs-input"
              :class="{ 'is-error': errors.phone }"
              :aria-invalid="!!errors.phone"
              :aria-describedby="errors.phone ? 'cs-phone-err' : undefined"
              aria-required="true"
              @blur="validate('phone')"
            />
            <p v-if="errors.phone" id="cs-phone-err" class="cs-err">{{ errors.phone }}</p>
          </div>
        </div>
        <div>
          <label for="cs-content" class="cs-label">留言内容 <span class="cs-req" aria-hidden="true">*</span></label>
          <textarea
            id="cs-content"
            v-model="form.content"
            rows="5"
            :maxlength="CONTENT_MAX"
            placeholder="请描述您的需求或咨询内容"
            class="cs-input resize-none"
            :class="{ 'is-error': errors.content }"
            :aria-invalid="!!errors.content"
            :aria-describedby="errors.content ? 'cs-content-err' : 'cs-content-count'"
            aria-required="true"
            @blur="validate('content')"
          ></textarea>
          <div class="flex justify-between gap-4 mt-1">
            <p v-if="errors.content" id="cs-content-err" class="cs-err !mt-0">{{ errors.content }}</p>
            <span v-else></span>
            <span id="cs-content-count" class="text-xs text-ink-500 tabular-nums">{{ form.content.length }}/{{ CONTENT_MAX }}</span>
          </div>
        </div>
        <!-- 告知同意：收集姓名手机号属个人信息处理，须取得单独同意 -->
        <div>
          <label class="flex items-start gap-2.5 cursor-pointer">
            <input v-model="agreed" type="checkbox" class="cs-check" :aria-invalid="!!errors.agreed" :aria-describedby="errors.agreed ? 'cs-agree-err' : undefined" />
            <span class="text-[13px] leading-relaxed text-ink-500">
              我已阅读并同意<RouterLink to="/privacy" target="_blank" class="cs-link">《隐私政策》</RouterLink>，同意贵公司为回应本次咨询而使用我提交的联系方式。
            </span>
          </label>
          <p v-if="errors.agreed" id="cs-agree-err" class="cs-err">{{ errors.agreed }}</p>
        </div>
        <button type="submit" :disabled="submitting" class="cs-submit">
          <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ submitting ? '提交中…' : '提交留言' }}
        </button>
        <p v-if="notice" class="text-center text-sm font-medium" :class="notice.ok ? 'text-emerald-700' : 'text-red-600'" role="status">{{ notice.text }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
// 联系方式展示 + 在线留言提交；已登录走会员反馈接口，未登录走匿名接口，均入后台「意见反馈」
import { reactive, ref, computed, watch } from 'vue'
import type { SiteInfo } from '@/api/home'
import { submitAnonymousFeedback, submitMemberFeedback } from '@/api/feedback'
import { useMemberStore } from '@/stores/member'
import { useThemeStore } from '@/stores/theme'
import { API_SUCCESS_CODE } from '@/config'
import { safeExternalUrl } from '@/utils/sanitize'
import { PHONE_PATTERN } from '@/utils/validators'
import { CONTACT_ICONS } from './contactIcons'

const memberStore = useMemberStore()
const theme = useThemeStore()
const props = defineProps<{ site: Partial<SiteInfo> }>()

/** 留言内容上限，与 SRS 3.5.2、后端 DTO 一致 */
const CONTENT_MAX = 500
/** 后端限流的业务码 */
const THROTTLED_CODE = 429
/** 参数校验失败的业务码，message 为可直接展示的中文原因 */
const VALIDATION_CODE = 400
/** 结果提示停留时长（SRS：约 4 秒后自动消失） */
const NOTICE_MS = 4000

// 联系方式：未配置的项不渲染（不再显示「暂无」）
const contactItems = computed(() => [
  { label: '联系电话', value: props.site.phone, icon: CONTACT_ICONS.phone, href: props.site.phone ? `tel:${props.site.phone}` : '', external: false },
  { label: '联系邮箱', value: props.site.contactEmail, icon: CONTACT_ICONS.mail, href: props.site.contactEmail ? `mailto:${props.site.contactEmail}` : '', external: false },
  // 后台配了地图链接时地址可点击跳转外部地图
  { label: '公司地址', value: props.site.address, icon: CONTACT_ICONS.pin, href: safeExternalUrl(props.site.mapLink), external: true },
  { label: '招聘邮箱', value: props.site.recruitEmail, icon: CONTACT_ICONS.people, href: props.site.recruitEmail ? `mailto:${props.site.recruitEmail}` : '', external: false },
].filter(item => !!item.value))

const submitting = ref(false)
const notice = ref<{ ok: boolean; text: string } | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const form = reactive({ name: '', phone: '', content: '' })
// 勾选态独立于 form：它不是要提交的业务字段，只是提交的前置条件
const agreed = ref(false)
const errors = reactive({ name: '', phone: '', content: '', agreed: '' })

watch(agreed, (v) => { if (v) errors.agreed = '' })

/** 单字段校验，提示文案取自 SRS 3.5.2 */
function validate(field: keyof typeof form) {
  if (field === 'name') {
    errors.name = memberStore.isLoggedIn || form.name.trim() ? '' : '请输入姓名'
  } else if (field === 'phone') {
    const phone = form.phone.trim()
    errors.phone = !phone ? '请输入手机号' : PHONE_PATTERN.test(phone) ? '' : '请输入有效的手机号'
  } else {
    errors.content = form.content.trim() ? '' : '请输入留言内容'
  }
}

function showNotice(ok: boolean, text: string) {
  notice.value = { ok, text }
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = null }, NOTICE_MS)
}

async function handleSubmit() {
  ;(['name', 'phone', 'content'] as const).forEach(validate)
  errors.agreed = agreed.value ? '' : '请阅读并同意《隐私政策》后再提交'
  if (Object.values(errors).some(Boolean)) return
  submitting.value = true
  try {
    const phone = form.phone.trim()
    const content = form.content.trim()
    const res = memberStore.isLoggedIn
      ? await submitMemberFeedback({ content, phone, sourcePage: '首页-联系我们' })
      : await submitAnonymousFeedback({ name: form.name.trim(), phone, content, sourcePage: '首页-联系我们' })
    if (res.code === API_SUCCESS_CODE) {
      form.name = ''
      form.phone = ''
      form.content = ''
      showNotice(true, '提交成功，我们将尽快与您联系')
    } else if (res.code === THROTTLED_CODE) {
      showNotice(false, '提交过于频繁，请稍后再试')
    } else if (res.code === VALIDATION_CODE && res.message) {
      // 校验失败给出具体原因（如手机号格式），用户才知道改哪里；
      // 只透出 400 的文案——那是后端写给用户看的，5xx 文案不一定适合展示
      showNotice(false, res.message)
    } else {
      showNotice(false, '提交失败，请稍后重试')
    }
  } catch {
    // 提交失败：保留已填内容，可重新提交
    showNotice(false, '提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped src="./contact-section.css"></style>
