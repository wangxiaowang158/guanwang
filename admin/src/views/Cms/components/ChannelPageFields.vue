<template>
  <!-- 官网页面配置：一级栏目专用。页面路径决定官网地址，菜单挂靠决定它出现在哪个一级导航的下拉里，
       外链用于不在本站的导航项；头图背景图、背景视频可直接上传 -->
  <a-divider style="margin: 4px 0 16px">官网页面</a-divider>
  <a-form-item label="页面类型">
    <a-radio-group :value="mode" @change="(e: { target: { value: PageMode } }) => setMode(e.target.value)">
      <a-radio-button value="none" :disabled="isHome">不对外</a-radio-button>
      <a-radio-button value="page">站内页面</a-radio-button>
      <a-radio-button value="link" :disabled="isHome">外部链接</a-radio-button>
    </a-radio-group>
  </a-form-item>
  <a-form-item v-if="mode === 'page'" label="页面路径" required>
    <a-input
      :value="model.portalPath"
      placeholder="如 /energy-solutions/overview"
      :disabled="isHome"
      :maxlength="66"
      @update:value="(v: string) => (model.portalPath = v.trim().toLowerCase())"
    />
    <div class="field-tip">
      一到两段，只含小写字母、数字与连字符；不能以 /api、/uploads、/article、/member 等系统地址开头。
      保存后即可在官网访问，页面区块在其下新增子栏目即可
    </div>
  </a-form-item>
  <a-form-item v-if="mode === 'link'" label="外链地址" required>
    <a-input v-model:value="model.externalUrl" placeholder="https://..." :maxlength="500" />
    <div class="field-tip">导航里点击后在新窗口打开，不对应站内页面</div>
  </a-form-item>
  <a-form-item v-if="mode !== 'none' && !isHome" label="菜单挂靠">
    <a-select
      v-model:value="model.menuParent"
      :options="dockOptions"
      placeholder="不挂靠：自身就是一个一级导航"
      allow-clear
      show-search
      option-filter-prop="label"
    />
    <div class="field-tip">选择后，本页面出现在该一级导航的下拉菜单里（如挂到「智慧能源解决方案」下）</div>
  </a-form-item>
  <template v-if="mode === 'page' && !isHome">
    <a-form-item label="头图背景图">
      <ImageUpload v-model="model.heroBg" ai-scene="banner" tip="建议 1920×600 以上；留空则使用「Banner管理」里该页面的头图" />
    </a-form-item>
    <a-form-item label="头图背景视频">
      <VideoUpload v-model="model.heroVideo" tip="选填，静音循环播放，背景图作首帧；手机端不播放" />
    </a-form-item>
  </template>
</template>

<script setup lang="ts">
// 一级栏目的官网页面配置，嵌在栏目管理编辑面板里；字段直接写回父组件的表单对象
import { computed, ref } from 'vue'
import type { Channel } from '@/api/cms'
import ImageUpload from './ImageUpload.vue'
import VideoUpload from './VideoUpload.vue'

/** 页面级字段，父组件表单需含这些键 */
export interface PageFieldsModel {
  id?: number
  key: string
  portalPath: string
  menuParent: string | undefined
  externalUrl: string
  heroBg: string
  heroVideo: string
}

type PageMode = 'none' | 'page' | 'link'

const props = defineProps<{
  /** 全部栏目，用于列出可挂靠的一级页面 */
  channels: Channel[]
}>()
const model = defineModel<PageFieldsModel>({ required: true })

// 首页路径固定为 /，不可改、不可挂靠、不可转外链（后端同样拒绝）
const isHome = computed(() => model.value.portalPath === '/' && model.value.key === 'home')

// 页面类型由已有字段推断；切换时清掉另一边的值，避免路径与外链同时存在被后端拒绝
// 只在挂载时推断一次：父组件每次打开编辑面板都以新 key 重建本组件，取消再开不会残留上次的选择
const inferMode = (): PageMode => (model.value.portalPath ? 'page' : model.value.externalUrl ? 'link' : 'none')
const mode = ref<PageMode>(inferMode())

/** 页面路径形态，与后端 PORTAL_PATH_INPUT 一致：一到两段，每段小写字母或数字开头、不超过 32 字 */
const PATH_RE = /^\/[a-z0-9][a-z0-9-]{0,31}(?:\/[a-z0-9][a-z0-9-]{0,31})?$/

/**
 * 保存前校验，供父组件调用
 * @returns 错误提示；通过返回 null
 */
function validate(): string | null {
  if (mode.value === 'page' && !isHome.value) {
    if (!model.value.portalPath) return '请填写页面路径，或把页面类型改为「不对外」'
    if (!PATH_RE.test(model.value.portalPath)) return '页面路径须形如 /energy-solutions 或 /energy-solutions/overview，只含小写字母、数字与连字符'
  }
  if (mode.value === 'link') {
    const url = model.value.externalUrl.trim()
    if (!url) return '请填写外链地址，或把页面类型改为「不对外」'
    if (!/^https?:\/\/\S+$/.test(url)) return '外链须以 http:// 或 https:// 开头'
  }
  return null
}

defineExpose({ validate })

function setMode(next: PageMode): void {
  mode.value = next
  if (next !== 'page') {
    model.value.portalPath = ''
    model.value.heroBg = ''
    model.value.heroVideo = ''
  }
  if (next !== 'link') model.value.externalUrl = ''
  if (next === 'none') model.value.menuParent = undefined
}

/**
 * 可挂靠的目标：首页以外、配了页面路径、自身未挂靠的一级栏目（导航只有两层），且不是自己
 * 已有页面挂靠在本栏目下时，本栏目不能再挂出去，此时不给选项（后端同样拒绝）
 */
const dockOptions = computed(() => {
  const self = model.value.key
  if (self && props.channels.some(c => c.menuParent === self)) return []
  return props.channels
    .filter(c => c.parentId === null && c.portalPath && c.portalPath !== '/' && !c.menuParent && c.key !== self)
    .sort((a, b) => a.sort - b.sort)
    .map(c => ({ label: `${c.name}（${c.portalPath}）`, value: c.key }))
})
</script>

<style scoped>
.field-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
}
</style>
