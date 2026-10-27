<template>
  <!-- 新留言推送设置：选群机器人类型、粘贴 webhook 地址、发测试消息 -->
  <a-modal v-model:open="open" title="新留言推送到群" :width="560" :confirm-loading="saving" ok-text="保存" @ok="onSave">
    <a-spin :spinning="loading">
      <a-alert
        type="info"
        show-icon
        class="tip"
        message="官网有新留言时，自动在工作群里发一条提醒（手机号会打码）。"
        description="在群设置里添加「群机器人」，复制它的 Webhook 地址粘贴到下面即可。"
      />
      <a-form layout="vertical">
        <a-form-item label="机器人类型">
          <a-radio-group v-model:value="type" :options="NOTIFY_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))" />
        </a-form-item>
        <a-form-item label="Webhook 地址" :extra="urlTip">
          <a-input
            v-model:value="url"
            :placeholder="current?.webhookMasked ? `已配置：${current.webhookMasked}（留空则不修改）` : `https://${hostOf(type)}/…`"
            allow-clear
            :maxlength="500"
          />
        </a-form-item>
      </a-form>
      <div class="foot">
        <span class="status">
          当前状态：
          <a-tag :color="current?.from === 'none' ? 'default' : 'green'">{{ FROM_LABEL[current?.from ?? 'none'] }}</a-tag>
        </span>
        <a-space>
          <a-popconfirm v-if="current?.from === 'admin'" title="确定清除后台配置的推送地址吗？" @confirm="onClear">
            <a-button danger size="small">清除</a-button>
          </a-popconfirm>
          <a-button size="small" :loading="testing" :disabled="current?.from === 'none'" @click="onTest">发一条测试</a-button>
        </a-space>
      </div>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
// 推送配置弹窗：地址只写不读（后端只回打码值），留空保存表示只改类型
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  getNotifyConfig, saveNotifyConfig, sendNotifyTest, NOTIFY_TYPE_OPTIONS,
  type NotifyConfig, type NotifyType,
} from '@/api/feedback'

const open = defineModel<boolean>('open', { required: true })

const FROM_LABEL: Record<NotifyConfig['from'], string> = {
  admin: '已开启（后台配置）',
  env: '已开启（服务器配置）',
  none: '未开启',
}

const current = ref<NotifyConfig | null>(null)
const type = ref<NotifyType>('wecom')
const url = ref('')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)

const hostOf = (t: NotifyType) => NOTIFY_TYPE_OPTIONS.find(o => o.value === t)?.host ?? ''
const urlTip = computed(() => `须以 https://${hostOf(type.value)}/ 开头；地址里含机器人密钥，保存后只显示打码值`)

const load = async () => {
  loading.value = true
  try {
    const res = await getNotifyConfig()
    if (res.data.code === 200 && res.data.data) {
      current.value = res.data.data
      type.value = res.data.data.type
    } else {
      message.error(res.data.message || '读取推送配置失败')
    }
  } catch {
    message.error('读取推送配置失败')
  } finally {
    loading.value = false
  }
}

watch(open, (v) => {
  if (!v) return
  url.value = ''
  void load()
})

/**
 * 保存
 * @param webhookUrl 不传＝沿用输入框；空串＝清除
 */
const submit = async (webhookUrl?: string) => {
  saving.value = true
  try {
    const res = await saveNotifyConfig(type.value, webhookUrl)
    if (res.data.code !== 200) {
      message.error(res.data.message || '保存失败')
      return false
    }
    current.value = res.data.data
    url.value = ''
    message.success(webhookUrl === '' ? '已清除' : '已保存，可点「发一条测试」确认能收到')
    return true
  } catch {
    message.error('保存失败，请稍后重试')
    return false
  } finally {
    saving.value = false
  }
}

// 输入框留空：只改类型、保留原地址（后端不回显原地址，前端拿不到）
const onSave = () => submit(url.value.trim() || undefined)
const onClear = () => submit('')

const onTest = async () => {
  testing.value = true
  try {
    const res = await sendNotifyTest()
    if (res.data.code === 200) message.success(res.data.message || '测试消息已发送')
    else message.error(res.data.message || '推送失败')
  } catch {
    message.error('推送失败，请稍后重试')
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.tip { margin-bottom: 16px; }
.foot { display: flex; align-items: center; justify-content: space-between; }
.status { font-size: 13px; color: #595959; }
</style>
