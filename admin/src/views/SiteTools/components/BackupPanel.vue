<template>
  <!-- 数据备份：一键导出全部业务数据（JSON），仅超管 -->
  <div class="backup">
    <a-alert type="warning" show-icon class="tip">
      <template #message>导出文件含管理员与会员的密码哈希、手机号等敏感数据，请妥善保管，不要通过聊天工具或邮件随意传递。</template>
    </a-alert>
    <ul class="notes">
      <li>导出内容：栏目、内容（含回收站与历史版本）、站点信息、留言、会员、管理员与角色、跳转规则等全部业务数据。</li>
      <li>不含上传的图片、视频与附件本身（服务器 data/uploads 目录），请随数据卷一并备份。</li>
      <li>访问记录、操作日志、登录日志量大且可再生，默认不导出；需要时勾选下方选项。</li>
    </ul>
    <a-space>
      <a-checkbox v-model:checked="withLogs">含访问 / 操作 / 登录日志</a-checkbox>
      <a-button type="primary" :loading="exporting" @click="onExport">
        <template #icon><DownloadOutlined /></template>
        导出备份
      </a-button>
    </a-space>
  </div>
</template>

<script setup lang="ts">
// 数据备份导出：成功回 JSON 文件流；失败（如权限不足）回业务 JSON；前者 octet-stream、后者 application/json，按 MIME 区分
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import { exportBackup } from '@/api/siteTools'
import { parseFileName, readBlobError, saveBlob } from '@/utils/download'

const EXPORT_FAILED = '导出失败，请稍后重试'

const withLogs = ref(false)
const exporting = ref(false)

const onExport = async () => {
  exporting.value = true
  try {
    const res = await exportBackup(withLogs.value)
    // 备份文件以 octet-stream 下发，业务错误是 application/json，按类型即可区分
    const failure = await readBlobError(res.data)
    if (failure) {
      message.error(failure.message || EXPORT_FAILED)
      return
    }
    const fileName = parseFileName(res.headers['content-disposition'] as string | undefined)
    saveBlob(res.data, fileName || `zrh-backup-${Date.now()}.json`)
    message.success('备份已导出，请妥善保管')
  } catch {
    message.error(EXPORT_FAILED)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.backup { max-width: 760px; }
.tip { margin-bottom: 12px; }
.notes { margin: 0 0 16px; padding-left: 20px; color: #595959; font-size: 13px; line-height: 1.9; }
</style>
