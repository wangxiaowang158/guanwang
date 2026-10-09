<template>
  <!-- 线索预约弹窗：全站唯一一份，挂在 DefaultLayout；由 useLeadModal 的 openLead 唤起 -->
  <Teleport to="body">
    <Transition name="lead-fade">
      <div v-if="visible" class="lead-mask" :class="{ 'lead--style2': theme.isStyle2 }" @mousedown.self="closeLead">
        <div
          ref="dialogRef"
          class="lead-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lead-title"
          tabindex="-1"
        >
          <button type="button" class="lead-close" aria-label="关闭弹窗" @click="closeLead">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <!-- 提交成功：给出明确结果并把焦点交给「完成」按钮 -->
          <div v-if="done" class="lead-done" role="status">
            <h2 id="lead-title" class="lead-title">提交成功</h2>
            <p class="lead-hint">已收到您的{{ LEAD_TYPE_LABEL[form.leadType] }}需求，我们将尽快与您联系。</p>
            <button ref="doneRef" type="button" class="lead-submit" @click="closeLead">完成</button>
          </div>

          <template v-else>
            <h2 id="lead-title" class="lead-title">{{ LEAD_TYPE_LABEL[form.leadType] }}</h2>
            <p class="lead-hint">请留下联系方式与需求，带 <span class="lead-req" aria-hidden="true">*</span><span class="sr-only">星号</span> 的为必填项。</p>
            <form class="lead-form" novalidate @submit.prevent="handleSubmit">
              <div class="lead-grid">
                <div class="lead-field">
                  <label for="lead-name" class="lead-label">姓名 <span class="lead-req" aria-hidden="true">*</span></label>
                  <input id="lead-name" v-model="form.name" type="text" maxlength="20" autocomplete="name" class="lead-input" :class="{ 'is-error': errors.name }" aria-required="true" :aria-invalid="!!errors.name" :aria-describedby="errors.name ? 'lead-name-err' : undefined" @blur="validate('name')" />
                  <p v-if="errors.name" id="lead-name-err" class="lead-err">{{ errors.name }}</p>
                </div>
                <div class="lead-field">
                  <label for="lead-company" class="lead-label">单位 <span class="lead-req" aria-hidden="true">*</span></label>
                  <input id="lead-company" v-model="form.company" type="text" maxlength="100" autocomplete="organization" class="lead-input" :class="{ 'is-error': errors.company }" aria-required="true" :aria-invalid="!!errors.company" :aria-describedby="errors.company ? 'lead-company-err' : undefined" @blur="validate('company')" />
                  <p v-if="errors.company" id="lead-company-err" class="lead-err">{{ errors.company }}</p>
                </div>
                <div class="lead-field">
                  <label for="lead-phone" class="lead-label">手机号 <span class="lead-req" aria-hidden="true">*</span></label>
                  <input id="lead-phone" v-model="form.phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel" class="lead-input" :class="{ 'is-error': errors.phone }" aria-required="true" :aria-invalid="!!errors.phone" :aria-describedby="errors.phone ? 'lead-phone-err' : undefined" @blur="validate('phone')" />
                  <p v-if="errors.phone" id="lead-phone-err" class="lead-err">{{ errors.phone }}</p>
                </div>
                <div class="lead-field">
                  <label for="lead-type" class="lead-label">需求类型 <span class="lead-req" aria-hidden="true">*</span></label>
                  <select id="lead-type" v-model="form.leadType" class="lead-input" aria-required="true">
                    <option v-for="opt in LEAD_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="lead-field">
                  <label for="lead-email" class="lead-label">邮箱（选填）</label>
                  <input id="lead-email" v-model="form.email" type="email" maxlength="100" autocomplete="email" class="lead-input" :class="{ 'is-error': errors.email }" :aria-invalid="!!errors.email" :aria-describedby="errors.email ? 'lead-email-err' : undefined" @blur="validate('email')" />
                  <p v-if="errors.email" id="lead-email-err" class="lead-err">{{ errors.email }}</p>
                </div>
                <div class="lead-field">
                  <label for="lead-position" class="lead-label">职位（选填）</label>
                  <input id="lead-position" v-model="form.position" type="text" maxlength="50" autocomplete="organization-title" class="lead-input" />
                </div>
              </div>
              <div class="lead-field">
                <label for="lead-content" class="lead-label">留言 <span class="lead-req" aria-hidden="true">*</span></label>
                <textarea id="lead-content" v-model="form.content" rows="4" :maxlength="CONTENT_MAX" placeholder="请简述您的需求，如项目类型、规模、期望时间" class="lead-input resize-none" :class="{ 'is-error': errors.content }" aria-required="true" :aria-invalid="!!errors.content" :aria-describedby="errors.content ? 'lead-content-err' : undefined" @blur="validate('content')"></textarea>
                <div class="lead-count-row">
                  <p v-if="errors.content" id="lead-content-err" class="lead-err">{{ errors.content }}</p>
                  <span v-else></span>
                  <span class="lead-count">{{ form.content.length }}/{{ CONTENT_MAX }}</span>
                </div>
              </div>
              <div class="lead-field">
                <label class="lead-agree">
                  <input v-model="agreed" type="checkbox" class="lead-check" :aria-invalid="!!errors.agreed" :aria-describedby="errors.agreed ? 'lead-agree-err' : undefined" />
                  <span>我已阅读并同意<RouterLink to="/privacy" target="_blank" class="lead-link">《隐私政策》</RouterLink>，同意贵公司为回应本次需求而使用我提交的联系方式。</span>
                </label>
                <p v-if="errors.agreed" id="lead-agree-err" class="lead-err">{{ errors.agreed }}</p>
              </div>
              <p v-if="submitError" class="lead-err lead-err--block" role="alert">{{ submitError }}</p>
              <button type="submit" class="lead-submit" :disabled="submitting">{{ submitting ? '提交中…' : '提交' }}</button>
            </form>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// 线索预约弹窗：姓名/单位/手机/需求类型/邮箱/职位/留言，走匿名反馈接口入后台「意见反馈」
import { nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { LEAD_TYPE_LABEL, submitAnonymousFeedback } from '@/api/feedback'
import type { LeadType } from '@/api/feedback'
import { API_SUCCESS_CODE } from '@/config'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useLeadModal } from '@/composables/useLeadModal'
import { useThemeStore } from '@/stores/theme'
import { PHONE_PATTERN, checkOptionalEmail } from '@/utils/validators'

const theme = useThemeStore()
const route = useRoute()
const { visible, leadType, sourceHint, closeLead } = useLeadModal()

/** 留言内容上限，与后端 DTO 一致 */
const CONTENT_MAX = 500
/** 后端限流 / 参数校验失败的业务码；校验失败的 message 可直接展示 */
const THROTTLED_CODE = 429
const VALIDATION_CODE = 400
/** 来源页面上限，与后端 DTO 一致 */
const SOURCE_MAX = 200

const LEAD_OPTIONS = (Object.keys(LEAD_TYPE_LABEL) as LeadType[]).map(value => ({ value, label: LEAD_TYPE_LABEL[value] }))

const dialogRef = ref<HTMLElement>()
const doneRef = ref<HTMLButtonElement>()
const submitting = ref(false)
const done = ref(false)
const submitError = ref('')
const agreed = ref(false)
const form = reactive({ name: '', company: '', phone: '', leadType: 'consult' as LeadType, email: '', position: '', content: '' })
const errors = reactive({ name: '', company: '', phone: '', email: '', content: '', agreed: '' })

useFocusTrap(visible, dialogRef, closeLead, '#lead-name')

// 每次打开：带入预选类型，保留上次未提交的输入，但成功态与错误提示要清掉
watch(visible, (on) => {
  if (!on) return
  form.leadType = leadType.value
  done.value = false
  submitError.value = ''
  Object.keys(errors).forEach((k) => { errors[k as keyof typeof errors] = '' })
})

watch(agreed, (v) => { if (v) errors.agreed = '' })

/** 单字段校验；手机与邮箱复用 utils/validators */
function validate(field: 'name' | 'company' | 'phone' | 'email' | 'content'): void {
  if (field === 'phone') {
    const phone = form.phone.trim()
    errors.phone = !phone ? '请输入手机号' : PHONE_PATTERN.test(phone) ? '' : '请输入有效的手机号'
  } else if (field === 'email') {
    errors.email = checkOptionalEmail(form.email)
  } else {
    const text = { name: '请输入姓名', company: '请输入单位名称', content: '请输入留言内容' }
    errors[field] = form[field].trim() ? '' : text[field]
  }
}

/** 来源页面：「线索类型 | 当前路径 | 补充说明」，超长截断 */
function sourcePage(): string {
  const parts = [LEAD_TYPE_LABEL[form.leadType], route.path, sourceHint.value].filter(Boolean)
  return parts.join(' | ').slice(0, SOURCE_MAX)
}

async function handleSubmit(): Promise<void> {
  (['name', 'company', 'phone', 'email', 'content'] as const).forEach(validate)
  errors.agreed = agreed.value ? '' : '请阅读并同意《隐私政策》后再提交'
  if (Object.values(errors).some(Boolean)) return
  submitting.value = true
  submitError.value = ''
  try {
    const res = await submitAnonymousFeedback({
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      leadType: form.leadType,
      email: form.email.trim() || undefined,
      position: form.position.trim() || undefined,
      content: form.content.trim(),
      sourcePage: sourcePage(),
    })
    if (res.code === API_SUCCESS_CODE) {
      done.value = true
      // 成功后清空业务字段，下次再开是干净的表单
      Object.assign(form, { name: '', company: '', phone: '', email: '', position: '', content: '' })
      agreed.value = false
      await nextTick()
      doneRef.value?.focus()
    } else if (res.code === THROTTLED_CODE) {
      submitError.value = '提交过于频繁，请稍后再试'
    } else if (res.code === VALIDATION_CODE && res.message) {
      submitError.value = res.message
    } else {
      submitError.value = '提交失败，请稍后重试'
    }
  } catch {
    // 网络失败：保留已填内容，可直接重试
    submitError.value = '提交失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>
<style scoped>
.lead-mask {
  --lead-accent: var(--color-brand-600);
  --lead-radius: var(--radius-lg);
  --lead-ctl-radius: var(--radius-md);
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}
.lead--style2 { --lead-accent: var(--rs-primary); --lead-radius: 0; --lead-ctl-radius: 0; }
.lead-dialog {
  position: relative;
  width: 100%;
  max-width: 600px;
  max-height: calc(100svh - 32px);
  overflow-y: auto;
  padding: 32px;
  background: #fff;
  border-radius: var(--lead-radius);
  box-shadow: var(--shadow-3);
}
.lead-dialog:focus { outline: none; }
.lead-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-500);
  background: none;
  border: 0;
  cursor: pointer;
}
.lead-close:hover,
.lead-close:focus-visible { color: var(--lead-accent); }
.lead-title { margin: 0 40px 6px 0; font-size: var(--text-fs-h3); font-weight: 700; color: var(--color-ink-900); }
.lead-hint { margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: var(--color-ink-500); }
.lead-form { display: flex; flex-direction: column; gap: 16px; }
.lead-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.lead-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; color: var(--color-ink-700); }
.lead-req { color: #dc2626; }
.lead-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--color-ink-900);
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--lead-ctl-radius);
}
.lead-input:focus-visible { outline: 2px solid var(--lead-accent); outline-offset: 1px; border-color: var(--lead-accent); }
.lead-input.is-error { border-color: #dc2626; }
.lead-err { margin: 4px 0 0; font-size: 13px; color: #dc2626; }
.lead-err--block { margin: 0; }
.lead-count-row { display: flex; justify-content: space-between; gap: 12px; margin-top: 4px; }
.lead-count { font-size: 12px; color: var(--color-ink-500); font-variant-numeric: tabular-nums; }
.lead-agree { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.7; color: var(--color-ink-500); cursor: pointer; }
.lead-check { flex-shrink: 0; width: 18px; height: 18px; margin-top: 2px; accent-color: var(--lead-accent); }
.lead-link { color: var(--lead-accent); text-decoration: underline; }
.lead-submit {
  height: 46px;
  padding: 0 28px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  background: var(--lead-accent);
  border: 0;
  border-radius: var(--lead-ctl-radius);
  cursor: pointer;
  transition: filter var(--dur-fast);
}
.lead-submit:hover:not(:disabled) { filter: brightness(1.1); }
.lead-submit:disabled { cursor: progress; opacity: 0.7; }
.lead-done { padding: 12px 0 4px; text-align: left; }

.lead-fade-enter-active,
.lead-fade-leave-active { transition: opacity var(--dur-fast) ease; }
.lead-fade-enter-from,
.lead-fade-leave-to { opacity: 0; }

@media (max-width: 640px) {
  .lead-dialog { padding: 24px 18px; }
  .lead-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
