<template>
  <!-- 栏目页尾咨询通栏：读完整页的访客顺手留资，不用翻回顶部找按钮 -->
  <section class="ccb" :class="{ 'ccb--s2': style2 }" aria-labelledby="channel-cta-title">
    <div class="ccb-inner" :class="style2 ? 'rs-channel-container' : 'site-container'">
      <div class="ccb-text">
        <h2 id="channel-cta-title" class="ccb-title">有项目需求？</h2>
        <!-- 不写具体响应时限：那是对客户的服务承诺，须由业务方确认后再写 -->
        <p class="ccb-desc">告诉我们建筑类型与用能情况，专属顾问会尽快与您联系，一起梳理节能改造思路。</p>
      </div>
      <div class="ccb-actions">
        <button type="button" class="btn-pill btn-pill--primary" @click="openLead('consult', `${source}页尾`)">立即咨询</button>
        <button type="button" class="btn-pill btn-pill--ghost" @click="openLead('energyAssess', `${source}页尾`)">预约节能测算</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// 线索来源带上栏目名，后台能看出是哪个页面带来的
import { useLeadModal } from '@/composables/useLeadModal'

defineProps<{ source: string; style2?: boolean }>()
const { openLead } = useLeadModal()
</script>

<style scoped>
/* 苹果式收尾区：中性浅灰（深色站为深灰）底、居中大字 + 两枚胶囊按钮，不用品牌色渐变通栏 */
.ccb { padding: clamp(72px, 9vw, 128px) 0; background: var(--color-surface); }
.ccb-inner { display: flex; flex-direction: column; align-items: center; gap: 32px; text-align: center; }
.ccb-text { max-width: 720px; }
.ccb-title { margin: 0; font-size: var(--text-fs-h2); font-weight: 700; line-height: 1.15; color: var(--color-ink-900); }
.ccb-desc { margin: 16px 0 0; font-size: var(--text-fs-body-lg); line-height: 1.6; color: var(--color-ink-500); }
.ccb-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
</style>
