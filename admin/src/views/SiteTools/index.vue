<template>
  <div class="site-tools">
    <div class="page-title">站点工具</div>
    <a-tabs v-model:active-key="tab">
      <a-tab-pane key="redirect" tab="跳转规则">
        <RedirectPanel />
      </a-tab-pane>
      <!-- 数据备份含全库敏感数据，仅超管可见；后端同口径再校验 -->
      <a-tab-pane v-if="isSuper" key="backup" tab="数据备份">
        <BackupPanel />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
// 站点工具：跳转规则（需「站点工具」权限）、数据备份（仅超管）
import { ref } from 'vue'
import { useUserStore } from '@/store/modules/user'
import RedirectPanel from './components/RedirectPanel.vue'
import BackupPanel from './components/BackupPanel.vue'

defineOptions({ name: 'SiteTools' })

const { isSuper } = useUserStore()
const tab = ref('redirect')
</script>

<style scoped>
.site-tools {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 8px;
}
</style>
