<template>
  <!-- 招聘职位：每条可展开看职责与要求；用原生 details，键盘与读屏开箱即用，不必自己维护展开态 -->
  <div class="jobs" :class="{ 'jobs--style2': style2, 'jobs--dark': onDark }">
    <details v-for="job in items" :key="job.id" class="job">
      <summary class="job-head">
        <span class="job-title">{{ job.title }}</span>
        <span class="job-meta">
          <span v-if="job.brand">{{ job.brand }}</span>
          <span v-if="job.subtitle">{{ job.subtitle }}</span>
          <span v-if="job.date" class="tabular-nums">{{ job.date }}</span>
        </span>
        <svg class="job-arrow w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div class="job-body">
        <p v-if="job.desc" class="job-desc">{{ job.desc }}</p>
        <!-- eslint-disable-next-line vue/no-v-html -- 已过 DOMPurify 净化 -->
        <div v-if="job.html" class="rich-html job-html" v-html="sanitizeRichText(job.html)"></div>
        <div class="job-apply">
          <a v-if="recruitEmail" :href="mailtoOf(job.title)" class="job-apply-btn">投递简历</a>
          <span v-if="recruitEmail" class="job-apply-tip">简历请发送至 {{ recruitEmail }}，邮件标题注明「应聘{{ job.title }}」</span>
          <button v-else type="button" class="job-apply-btn" @click="openLead('consult', `应聘-${job.title}`)">留下联系方式</button>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
// 招聘职位列表；投递走基本信息里的招聘邮箱，未配置时退回留言弹窗
import { computed } from 'vue'
import type { PageItem } from '@/api/page'
import { useLeadModal } from '@/composables/useLeadModal'
import { useSiteStore } from '@/stores/site'
import { sanitizeRichText } from '@/utils/sanitize'

withDefaults(defineProps<{ items: PageItem[]; style2?: boolean; onDark?: boolean }>(), { style2: false, onDark: false })

const siteStore = useSiteStore()
const { openLead } = useLeadModal()
const recruitEmail = computed(() => siteStore.site.recruitEmail?.trim() || '')

const mailtoOf = (title: string) =>
  `mailto:${recruitEmail.value}?subject=${encodeURIComponent(`应聘${title}`)}`
</script>

<style scoped>
.jobs {
  --job-accent: var(--color-brand-600);
  --job-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 64rem;
  margin: 0 auto;
}
.jobs--style2 {
  --job-accent: var(--rs-primary);
  --job-radius: 0;
}
.job {
  background: #fff;
  border: 1px solid var(--color-line);
  border-radius: var(--job-radius);
  transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
}
.job[open] {
  border-color: var(--job-accent);
  box-shadow: var(--shadow-2);
}
.job-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 18px 20px;
  cursor: pointer;
  list-style: none;
}
.job-head::-webkit-details-marker {
  display: none;
}
.job-head:focus-visible {
  outline: 2px solid var(--job-accent);
  outline-offset: 2px;
}
.job-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-ink-900);
}
.job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 13px;
  color: var(--color-ink-500);
}
.job-arrow {
  margin-left: auto;
  color: var(--color-ink-500);
  transition: transform var(--dur-fast) ease;
}
.job[open] .job-arrow {
  transform: rotate(180deg);
}
.job-body {
  padding: 0 20px 20px;
  border-top: 1px solid var(--color-line);
}
.job-desc {
  margin-top: 16px;
  font-weight: 500;
  color: var(--color-ink-700);
}
.job-html {
  margin-top: 12px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--color-ink-700);
}
.job-apply {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 20px;
}
.job-apply-btn {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 22px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: var(--job-accent);
  border-radius: var(--radius-md);
}
.jobs--style2 .job-apply-btn {
  border-radius: 0;
}
.job-apply-btn:hover {
  opacity: 0.9;
}
.job-apply-tip {
  font-size: 13px;
  color: var(--color-ink-500);
}
/* 背景图区块上：卡片仍用白底，保证正文可读 */
.jobs--dark .job {
  border-color: transparent;
}
@media (prefers-reduced-motion: reduce) {
  .job, .job-arrow {
    transition: none;
  }
}
</style>
