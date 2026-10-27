<template>
  <!-- 统计与显示：统计代码、站长验证、灰色模式、悬浮咨询条、图片处理；独立保存，只提交 extConfig -->
  <a-form :label-col="{ style: { width: '120px' } }">
    <a-divider orientation="left" class="group-title group-title--first">统计代码</a-divider>
    <a-alert
      type="info"
      show-icon
      class="block-tip"
      message="只需填写统计平台分配的 ID，系统会自动加载官方统计脚本。出于安全考虑，不支持粘贴任意脚本代码。"
    />
    <a-form-item label="百度统计 ID">
      <a-input v-model:value="cfg.baiduTongji" :maxlength="32" placeholder="32 位字母数字" allow-clear />
      <div class="field-tip">百度统计「获取代码」里 hm.js? 后面的那一串，例如 hm.js?<b>1a2b3c…</b></div>
    </a-form-item>
    <a-form-item label="GA4 衡量 ID">
      <a-input v-model:value="cfg.gaId" :maxlength="24" placeholder="G-XXXXXXXXXX" allow-clear />
      <div class="field-tip">Google Analytics 4 数据流详情里的「衡量 ID」，以 G- 开头</div>
    </a-form-item>

    <a-divider orientation="left" class="group-title">站长验证</a-divider>
    <div class="field-tip block-tip">
      各站长平台验证网站所有权时会给一段 meta 标签，只粘贴其中 content="…" 引号里的值
    </div>
    <a-form-item v-for="v in VERIFY_ITEMS" :key="v.key" :label="v.label">
      <a-input v-model:value="cfg.verify[v.key]" :maxlength="100" :placeholder="`${v.meta} 的 content 值`" allow-clear />
    </a-form-item>

    <a-divider orientation="left" class="group-title">灰色模式</a-divider>
    <a-form-item label="立即开启">
      <a-switch v-model:checked="cfg.grayMode.enabled" />
      <div class="field-tip">开启后全站页面立即变为黑白，直到手动关闭；用于国家公祭日、重大哀悼日</div>
    </a-form-item>
    <a-form-item label="定时生效">
      <a-range-picker
        v-model:value="grayRange"
        value-format="YYYY-MM-DD"
        :placeholder="['开始日期', '结束日期']"
        allow-clear
      />
      <div class="field-tip">按北京时间自然日计算，含首尾两天；与上面的开关任一满足即生效。不需要时清空</div>
    </a-form-item>

    <a-divider orientation="left" class="group-title">悬浮咨询条</a-divider>
    <a-form-item label="显示悬浮条">
      <a-switch v-model:checked="cfg.floatBar.enabled" />
      <div class="field-tip">页面右下角的预约咨询、电话、微信与回到顶部按钮</div>
    </a-form-item>
    <template v-if="cfg.floatBar.enabled">
      <a-form-item label="电话按钮">
        <a-switch v-model:checked="cfg.floatBar.showPhone" />
        <span class="inline-tip">号码取「基本信息 → 联系电话」</span>
      </a-form-item>
      <a-form-item label="微信按钮">
        <a-switch v-model:checked="cfg.floatBar.showWechat" />
        <span class="inline-tip">二维码取「基本信息 → 微信二维码」</span>
      </a-form-item>
      <a-form-item label="在线客服链接">
        <a-input v-model:value="cfg.floatBar.kefuUrl" :maxlength="500" placeholder="https://" allow-clear />
        <div class="field-tip">第三方客服系统（如 53KF、美洽、企业微信客服）提供的会话页地址，访客点击后新窗口打开；留空不显示</div>
      </a-form-item>
    </template>

    <a-divider orientation="left" class="group-title">图片处理</a-divider>
    <a-alert
      type="warning"
      show-icon
      class="block-tip"
      message="仅对此后新上传的图片生效，已上传的图片不受影响。站点图标、LOGO、二维码、分享图始终按原图保存。"
    />
    <a-form-item label="添加水印">
      <a-switch v-model:checked="cfg.watermark.enabled" />
    </a-form-item>
    <template v-if="cfg.watermark.enabled">
      <a-form-item label="水印文字">
        <a-input v-model:value="cfg.watermark.text" :maxlength="30" placeholder="留空取公司简称" allow-clear />
      </a-form-item>
      <a-form-item label="水印位置">
        <a-select v-model:value="cfg.watermark.position" :options="POSITION_OPTIONS" style="width: 200px" />
        <div class="field-tip">小于 200px 的图片与 GIF 动图不加水印</div>
      </a-form-item>
    </template>
    <a-form-item label="转存为 WebP">
      <a-switch v-model:checked="cfg.watermark.webp" />
      <div class="field-tip">体积通常可减小 30% 以上，主流浏览器均支持；GIF 动图保持原格式</div>
    </a-form-item>

    <a-form-item class="actions">
      <a-button type="primary" :loading="saving" @click="onSave">保存</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
// 「基本信息管理 → 统计与显示」：独立保存，只提交 extConfig
// 后端按白名单净化，格式不对的值会被静默丢弃，故保存前先按同一口径校验并明确提示
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { saveSiteInfo, type SiteExtConfig, type WatermarkPosition } from '@/api/cms'

const props = defineProps<{ value?: SiteExtConfig | null }>()

/** 保存成功后回传，父组件据此更新缓存 */
const emit = defineEmits<{ saved: [SiteExtConfig] }>()

type VerifyKey = keyof SiteExtConfig['verify']

const VERIFY_ITEMS: { key: VerifyKey; label: string; meta: string }[] = [
  { key: 'baidu', label: '百度', meta: 'baidu-site-verification' },
  { key: 'google', label: 'Google', meta: 'google-site-verification' },
  { key: 'bing', label: 'Bing', meta: 'msvalidate.01' },
  { key: 'so360', label: '360 搜索', meta: '360-site-verification' },
  { key: 'sogou', label: '搜狗', meta: 'sogou_site_verification' },
]

const POSITION_OPTIONS: { label: string; value: WatermarkPosition }[] = [
  { label: '右下角', value: 'bottom-right' },
  { label: '左下角', value: 'bottom-left' },
  { label: '居中', value: 'center' },
]

/** 与后端 common/site-ext.ts 的校验口径一致 */
const BAIDU_ID = /^[a-f0-9]{32}$/i
const GA_ID = /^G-[A-Z0-9]{4,20}$/
const VERIFY_CODE = /^[A-Za-z0-9_.-]{4,100}$/
const HTTP_URL = /^https?:\/\/[^\s"'<>\\]+$/i

/** 编辑草稿：可选字符串统一成空串，便于 v-model */
type Draft = {
  baiduTongji: string
  gaId: string
  verify: Record<VerifyKey, string>
  grayMode: { enabled: boolean }
  floatBar: { enabled: boolean; showPhone: boolean; showWechat: boolean; kefuUrl: string }
  watermark: { enabled: boolean; text: string; position: WatermarkPosition; webp: boolean }
}

const toDraft = (v?: SiteExtConfig | null): Draft => ({
  baiduTongji: v?.baiduTongji ?? '',
  gaId: v?.gaId ?? '',
  verify: {
    baidu: v?.verify?.baidu ?? '', google: v?.verify?.google ?? '', bing: v?.verify?.bing ?? '',
    so360: v?.verify?.so360 ?? '', sogou: v?.verify?.sogou ?? '',
  },
  grayMode: { enabled: v?.grayMode?.enabled ?? false },
  floatBar: {
    enabled: v?.floatBar?.enabled ?? true,
    showPhone: v?.floatBar?.showPhone ?? true,
    showWechat: v?.floatBar?.showWechat ?? true,
    kefuUrl: v?.floatBar?.kefuUrl ?? '',
  },
  watermark: {
    enabled: v?.watermark?.enabled ?? false,
    text: v?.watermark?.text ?? '',
    position: v?.watermark?.position ?? 'bottom-right',
    webp: v?.watermark?.webp ?? false,
  },
})

const cfg = reactive<Draft>(toDraft(props.value))
/** 灰色模式区间单独存：range-picker 要的是二元组，清空时为 undefined */
const grayRange = ref<[string, string] | undefined>(
  props.value?.grayMode?.start && props.value.grayMode.end ? [props.value.grayMode.start, props.value.grayMode.end] : undefined,
)
watch(() => props.value, (v) => {
  Object.assign(cfg, toDraft(v))
  grayRange.value = v?.grayMode?.start && v.grayMode.end ? [v.grayMode.start, v.grayMode.end] : undefined
})

const trimmed = computed(() => ({
  baiduTongji: cfg.baiduTongji.trim(),
  gaId: cfg.gaId.trim(),
  kefuUrl: cfg.floatBar.kefuUrl.trim(),
}))

/** 保存前校验：填了但格式不对的明确提示，不让后端静默丢掉 */
function validate(): string | null {
  const t = trimmed.value
  if (t.baiduTongji && !BAIDU_ID.test(t.baiduTongji)) return '百度统计 ID 应为 32 位字母数字'
  if (t.gaId && !GA_ID.test(t.gaId)) return 'GA4 衡量 ID 应以 G- 开头，如 G-ABC123XYZ'
  for (const v of VERIFY_ITEMS) {
    const code = cfg.verify[v.key].trim()
    if (code && !VERIFY_CODE.test(code)) return `${v.label}验证码格式不正确：只粘贴 content 引号里的值`
  }
  if (t.kefuUrl && !HTTP_URL.test(t.kefuUrl)) return '在线客服链接须以 http:// 或 https:// 开头'
  return null
}

const saving = ref(false)
const onSave = async () => {
  const err = validate()
  if (err) {
    message.error(err)
    return
  }
  saving.value = true
  try {
    const t = trimmed.value
    const verify: SiteExtConfig['verify'] = {}
    for (const v of VERIFY_ITEMS) {
      const code = cfg.verify[v.key].trim()
      if (code) verify[v.key] = code
    }
    const extConfig: SiteExtConfig = {
      baiduTongji: t.baiduTongji || undefined,
      gaId: t.gaId || undefined,
      verify,
      grayMode: {
        enabled: cfg.grayMode.enabled,
        start: grayRange.value?.[0],
        end: grayRange.value?.[1],
      },
      floatBar: { ...cfg.floatBar, kefuUrl: t.kefuUrl || undefined },
      watermark: { ...cfg.watermark, text: cfg.watermark.text.trim() || undefined },
    }
    const res = await saveSiteInfo({ extConfig })
    if (res.data.code === 200) {
      message.success('统计与显示设置已保存')
      emit('saved', extConfig)
    } else {
      message.error(res.data.message || '保存失败，请稍后重试')
    }
  } catch {
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.group-title { margin: 32px 0 20px; font-size: 15px; font-weight: 600; color: #262626; }
.group-title--first { margin-top: 8px; }
.block-tip { margin-bottom: 16px; }
.field-tip { margin-top: 4px; font-size: 12px; color: #8c8c8c; }
.inline-tip { margin-left: 12px; font-size: 12px; color: #8c8c8c; }
.actions :deep(.ant-form-item-control-input-content) { display: flex; justify-content: flex-end; }
</style>
