<template>
  <!-- 页脚设置：显示哪些导航分栏、友情链接、社交账号；公司名称、电话、地址、备案号在「基本信息」里改 -->
  <a-form :label-col="{ style: { width: '110px' } }">
    <a-form-item label="导航分栏">
      <a-select
        v-model:value="cfg.columns"
        mode="multiple"
        :options="columnOptions"
        placeholder="不选则显示全部一级导航"
        allow-clear
      />
      <div class="field-tip">页脚按所选顺序分栏展示，每栏列出该导航的下拉项；不选即全部显示</div>
    </a-form-item>

    <a-form-item label="友情链接">
      <div class="rows">
        <div v-for="(l, i) in cfg.friendLinks" :key="i" class="row">
          <a-input v-model:value="l.name" :maxlength="100" placeholder="名称，如 中国建筑节能协会" class="row-name" />
          <a-input v-model:value="l.url" :maxlength="500" placeholder="https://..." class="row-url" />
          <a-button danger aria-label="删除" @click="cfg.friendLinks.splice(i, 1)"><template #icon><DeleteOutlined /></template></a-button>
        </div>
        <a-button type="dashed" :disabled="cfg.friendLinks.length >= MAX" @click="cfg.friendLinks.push({ name: '', url: '' })">
          <template #icon><PlusOutlined /></template>新增友情链接（{{ cfg.friendLinks.length }}/{{ MAX }}）
        </a-button>
      </div>
      <div class="field-tip">新窗口打开；名称与链接都填写才会保存，链接须以 http:// 或 https:// 开头</div>
    </a-form-item>

    <a-form-item label="社交账号">
      <div class="rows">
        <div v-for="(s, i) in cfg.socials" :key="i" class="social">
          <div class="row">
            <a-select v-model:value="s.type" :options="SOCIAL_OPTIONS" class="row-type" />
            <a-input v-model:value="s.url" :maxlength="500" placeholder="主页链接（选填），https://..." class="row-url" />
            <a-button danger aria-label="删除" @click="cfg.socials.splice(i, 1)"><template #icon><DeleteOutlined /></template></a-button>
          </div>
          <ImageUpload v-model="s.qr" raw no-ai tip="二维码（选填），建议 300×300；悬停图标时弹出" />
        </div>
        <a-button type="dashed" :disabled="cfg.socials.length >= MAX" @click="cfg.socials.push({ type: 'wechat', url: '', qr: '' })">
          <template #icon><PlusOutlined /></template>新增社交账号（{{ cfg.socials.length }}/{{ MAX }}）
        </a-button>
      </div>
      <div class="field-tip">链接与二维码至少填一项；页脚以图标展示，有链接点开主页，有二维码悬停弹出</div>
    </a-form-item>

    <a-form-item :wrapper-col="{ offset: 0 }" class="actions">
      <a-button type="primary" :loading="saving" @click="onSave">保存页脚设置</a-button>
    </a-form-item>
  </a-form>
</template>

<script setup lang="ts">
// 「基本信息管理 → 页脚设置」：独立保存，只提交 footerConfig
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { saveSiteInfo, type Channel, type FooterConfig, type SocialType } from '@/api/cms'
import ImageUpload from '../ImageUpload.vue'

const props = defineProps<{
  value?: FooterConfig | null
  /** 全部栏目，用于列出可选的一级导航 */
  channels: Channel[]
}>()

/** 保存成功后回传，父组件据此更新缓存，切页签再回来不会显示旧值 */
const emit = defineEmits<{ saved: [FooterConfig] }>()

const MAX = 30

const SOCIAL_OPTIONS: { label: string; value: SocialType }[] = [
  { label: '微信公众号', value: 'wechat' },
  { label: '微博', value: 'weibo' },
  { label: '抖音', value: 'douyin' },
  { label: '视频号', value: 'channels' },
  { label: '哔哩哔哩', value: 'bilibili' },
  { label: '领英', value: 'linkedin' },
]

/** 可选分栏：官网导航里的一级项（有页面路径、未挂靠、未隐藏） */
const columnOptions = computed(() =>
  props.channels
    .filter(c => c.parentId === null && c.portalPath && c.portalPath !== '/' && !c.menuParent && !c.hidden)
    .sort((a, b) => a.sort - b.sort)
    .map(c => ({ label: c.name, value: c.key })),
)

type Draft = {
  columns: string[]
  friendLinks: { name: string; url: string }[]
  socials: { type: SocialType; url: string; qr: string }[]
}
const toDraft = (v?: FooterConfig | null): Draft => ({
  columns: [...(v?.columns ?? [])],
  friendLinks: (v?.friendLinks ?? []).map(l => ({ ...l })),
  socials: (v?.socials ?? []).map(s => ({ type: s.type, url: s.url ?? '', qr: s.qr ?? '' })),
})
const cfg = reactive<Draft>(toDraft(props.value))
watch(() => props.value, (v) => Object.assign(cfg, toDraft(v)))

const HTTP = /^https?:\/\/\S+$/i

/** 保存前校验：填了一半的行明确提示，而不是让后端静默丢掉 */
function validate(): string | null {
  for (const l of cfg.friendLinks) {
    const name = l.name.trim(); const url = l.url.trim()
    if (!name && !url) continue
    if (!name || !url) return '友情链接的名称与链接都要填写'
    if (!HTTP.test(url)) return `友情链接「${name}」须以 http:// 或 https:// 开头`
  }
  for (const s of cfg.socials) {
    const url = s.url.trim()
    if (!url && !s.qr) return '每个社交账号至少填写主页链接或上传二维码'
    if (url && !HTTP.test(url)) return '社交账号主页链接须以 http:// 或 https:// 开头'
  }
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
    const footerConfig: FooterConfig = {
      columns: cfg.columns,
      friendLinks: cfg.friendLinks.map(l => ({ name: l.name.trim(), url: l.url.trim() })).filter(l => l.name && l.url),
      socials: cfg.socials.map(s => ({ type: s.type, url: s.url.trim() || undefined, qr: s.qr || undefined })),
    }
    const res = await saveSiteInfo({ footerConfig })
    if (res.data.code === 200) {
      message.success('页脚设置已保存')
      emit('saved', footerConfig)
    }
    else message.error(res.data.message || '保存失败，请稍后重试')
  } catch {
    message.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.rows { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; gap: 8px; align-items: center; }
.row-name { flex: 0 0 240px; }
.row-type { flex: 0 0 140px; }
.row-url { flex: 1; min-width: 0; }
.social { padding: 10px 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; display: flex; flex-direction: column; gap: 8px; }
.field-tip { margin-top: 4px; font-size: 12px; color: #8c8c8c; }
.actions :deep(.ant-form-item-control-input-content) { display: flex; justify-content: flex-end; }
</style>
