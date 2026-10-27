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
        <button type="button" class="ccb-btn ccb-btn--primary" @click="openLead('consult', `${source}页尾`)">立即咨询</button>
        <button type="button" class="ccb-btn" @click="openLead('energyAssess', `${source}页尾`)">预约节能测算</button>
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
.ccb { padding: clamp(40px, 6vw, 72px) 0; background: linear-gradient(120deg, var(--color-brand-900, #0b2550), var(--color-brand-600, #1f5eff)); color: #fff; }
.ccb--s2 { background: var(--rs-primary); }
.ccb-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 24px; }
.ccb-text { max-width: 640px; }
.ccb-title { margin: 0; font-size: var(--text-fs-h2); font-weight: 700; line-height: 1.25; }
.ccb-desc { margin: 10px 0 0; font-size: var(--text-fs-body); line-height: 1.7; color: rgba(255, 255, 255, 0.85); }
.ccb-actions { display: flex; flex-wrap: wrap; gap: 12px; }
/* 右下角悬浮快捷栏（QuickActions，right-4 + 约 48px 宽）会压住靠右的按钮，宽屏时让出它的位置 */
@media (min-width: 768px) {
  .ccb-actions { padding-right: 56px; }
}
.ccb-btn {
  height: 44px;
  padding: 0 22px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: background var(--dur-fast, 150ms), color var(--dur-fast, 150ms);
}
.ccb-btn:hover { background: rgba(255, 255, 255, 0.12); }
.ccb-btn--primary { color: var(--color-brand-700, #1645c4); background: #fff; border-color: #fff; }
.ccb-btn--primary:hover { background: rgba(255, 255, 255, 0.9); }
.ccb--s2 .ccb-btn { border-radius: 0; }
.ccb--s2 .ccb-btn--primary { color: var(--rs-primary); }
.ccb-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
</style>
