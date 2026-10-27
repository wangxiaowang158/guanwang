<template>
  <!-- 首页布局：首屏之后各板块的顺序、显隐、标题与底色；保存后官网首页刷新即生效 -->
  <div class="hl">
    <p class="hl-tip">
      首屏固定在最上方。下列板块从上到下即官网首页顺序；板块没有内容时自动不显示。
      标题留空时显示输入框里灰色提示的文字。
    </p>
    <ul class="hl-list">
      <li v-for="(s, i) in list" :key="s.key" class="hl-row" :class="{ 'is-off': !s.visible }">
        <div class="hl-head">
          <span class="hl-order">{{ i + 1 }}</span>
          <span class="hl-name">{{ META[s.key].name }}</span>
          <span class="hl-source">{{ META[s.key].source }}</span>
          <a-space class="hl-ops">
            <a-switch v-model:checked="s.visible" checked-children="显示" un-checked-children="隐藏" :aria-label="`显示 ${META[s.key].name}`" />
            <a-button size="small" :disabled="i === 0" :aria-label="`上移 ${META[s.key].name}`" @click="move(i, -1)">
              <template #icon><ArrowUpOutlined /></template>
            </a-button>
            <a-button size="small" :disabled="i === list.length - 1" :aria-label="`下移 ${META[s.key].name}`" @click="move(i, 1)">
              <template #icon><ArrowDownOutlined /></template>
            </a-button>
          </a-space>
        </div>
        <div v-if="s.visible" class="hl-body">
          <a-input v-model:value="s.eyebrow" :maxlength="100" :placeholder="`小标题，留空显示「${fallbackOf(s.key).eyebrow}」`" />
          <a-input v-model:value="s.title" :maxlength="100" :placeholder="`主标题，留空显示「${fallbackOf(s.key).title}」`" />
          <a-select v-model:value="s.tone" :options="toneOptions(s.key)" class="hl-tone" />
        </div>
      </li>
    </ul>
    <div class="hl-actions">
      <!-- 首页没有草稿，保存即生效，直接打开官网首页查看效果 -->
      <a-button v-if="homeUrl" :href="homeUrl" target="_blank" rel="noopener noreferrer">
        <template #icon><EyeOutlined /></template>
        打开官网首页
      </a-button>
      <a-button @click="onReset">恢复默认</a-button>
      <a-button type="primary" :loading="saving" @click="onSave">保存首页布局</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 「基本信息管理 → 首页布局」：独立保存，只提交 homeLayout，不影响其他基本信息字段
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ArrowDownOutlined, ArrowUpOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { saveSiteInfo, type Channel, type HomeSectionConfig, type HomeSectionKey } from '@/api/cms'
import { PORTAL_ORIGIN } from '@/config'

/**
 * contactHeading：旧版在「基本信息」里填的联系板块标题，前台仍作兜底，这里展示为占位提示
 * website：基本信息里的网站域名，未配置构建期官网地址时用它拼首页链接
 */
const props = defineProps<{
  value?: HomeSectionConfig[] | null
  contactHeading?: string
  website?: string
  /** 全部栏目：栏目型板块的标题留空时回落到栏目名/副标题，用于占位提示 */
  channels?: Channel[]
}>()

/** 官网首页地址：域名缺协议头时补 https（与后端 normalizeOrigin 一致），两处都没配时不显示按钮 */
const homeUrl = computed(() => {
  const raw = (PORTAL_ORIGIN || props.website?.trim() || '').replace(/\/+$/, '')
  if (!raw) return ''
  const origin = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  // 只放行纯域名（可带端口），挡掉伪协议与带引号等异常值
  return /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin) ? `${origin}/` : ''
})
/** 保存成功后回传，父组件据此更新缓存，切页签再回来不会显示旧值 */
const emit = defineEmits<{ saved: [HomeSectionConfig[]] }>()

/** 默认顺序，与后端 HOME_SECTIONS 一致 */
const DEFAULT_ORDER: HomeSectionKey[] = ['business-trio', 'advantage', 'case', 'news', 'partner', 'view', 'contact']

/** 板块说明：名称、内容来源、内置标题（作输入框占位提示） */
const META: Record<HomeSectionKey, { name: string; source: string; eyebrow: string; title: string }> = {
  'business-trio': { name: '三大业务', source: '取自三个业务页「解决方案」区块首条', eyebrow: '三大业务', title: '能源智能体 · 建筑生命体 · 未来人居' },
  advantage: { name: '核心优势', source: '首页 → 核心优势', eyebrow: '栏目名称', title: '栏目副标题' },
  case: { name: '项目案例', source: '取自项目案例 → 标杆案例；标杆案例为空时取案例展示最新 3 条', eyebrow: '项目案例', title: '用节能数据说话的标杆项目' },
  news: { name: '新闻资讯', source: '取自新闻资讯最新 3 条', eyebrow: '新闻资讯', title: '中瑞恒最新动态' },
  partner: { name: '战略合作', source: '首页 → 战略合作', eyebrow: '栏目名称', title: '栏目副标题' },
  view: { name: '我眼中的中瑞恒', source: '首页 → 我眼中的中瑞恒', eyebrow: '栏目名称', title: '栏目副标题' },
  contact: { name: '联系我们', source: '联系方式 + 在线留言', eyebrow: '联系我们', title: '联系板块标题' },
}

/** 栏目型板块对应的栏目 key，与后端 HOME_SECTION_KEYS 一致 */
const CHANNEL_OF: Partial<Record<HomeSectionKey, string>> = {
  advantage: 'home-advantage',
  partner: 'home-customer',
  view: 'home-view',
}

/** 栏目型板块栏目未配置时的内置文案，与前台 useHomeCopy 的 DEFAULT_HEADINGS 一致 */
const CHANNEL_DEFAULT: Partial<Record<HomeSectionKey, { eyebrow: string; title: string }>> = {
  advantage: { eyebrow: '核心优势', title: '从方案到交付的全程保障' },
  partner: { eyebrow: '战略合作', title: '产业伙伴 · 科创伙伴 · 合作伙伴' },
  view: { eyebrow: '我眼中的中瑞恒', title: '媒体与行业的关注和认可' },
}

/** 留空时前台实际显示的小标题/主标题，与前台 useHomeLayout 的兜底顺序一致 */
const fallbackOf = (key: HomeSectionKey) => {
  if (key === 'contact') {
    return { eyebrow: META.contact.eyebrow, title: props.contactHeading?.trim() || '留下需求，我们尽快与您联系' }
  }
  const def = CHANNEL_DEFAULT[key]
  if (!def) return { eyebrow: META[key].eyebrow, title: META[key].title }
  // 隐藏的栏目后端不下发标题，前台回落内置文案，这里同口径
  const ch = props.channels?.find(c => c.key === CHANNEL_OF[key] && !c.hidden)
  return { eyebrow: ch?.name?.trim() || def.eyebrow, title: ch?.subheading?.trim() || def.title }
}

/** 深色底只给内容在白卡片里的板块，与后端 DARK_TONE_SECTIONS 一致 */
const DARK_OK: HomeSectionKey[] = ['business-trio', 'advantage', 'case', 'view']
const toneOptions = (key: HomeSectionKey) => [
  { label: '底色：自动交替', value: 'auto' },
  { label: '底色：白色', value: 'white' },
  { label: '底色：浅色', value: 'surface' },
  ...(DARK_OK.includes(key) ? [{ label: '底色：深色', value: 'dark' }] : []),
]

const defaults = (): HomeSectionConfig[] => DEFAULT_ORDER.map(key => ({ key, visible: true, tone: 'auto', eyebrow: '', title: '' }))

/** 后端读取时已补齐全部板块；这里再兜一道，接口异常时也能编辑 */
const fromValue = (v?: HomeSectionConfig[] | null): HomeSectionConfig[] => {
  if (!v?.length) return defaults()
  const known = v.filter(s => META[s.key]).map(s => ({ ...s, eyebrow: s.eyebrow ?? '', title: s.title ?? '' }))
  const missing = DEFAULT_ORDER.filter(k => !known.some(s => s.key === k))
  return [...known, ...missing.map(key => ({ key, visible: true, tone: 'auto' as const, eyebrow: '', title: '' }))]
}

const list = ref<HomeSectionConfig[]>(fromValue(props.value))
watch(() => props.value, (v) => { list.value = fromValue(v) })

const move = (i: number, step: -1 | 1) => {
  const j = i + step
  if (j < 0 || j >= list.value.length) return
  const next = [...list.value]
  ;[next[i], next[j]] = [next[j], next[i]]
  list.value = next
}

const onReset = () => { list.value = defaults() }

const saving = ref(false)
const onSave = async () => {
  saving.value = true
  try {
    const homeLayout = list.value.map(s => ({ ...s, eyebrow: s.eyebrow?.trim() || undefined, title: s.title?.trim() || undefined }))
    const res = await saveSiteInfo({ homeLayout })
    if (res.data.code === 200) {
      message.success('首页布局已保存，刷新官网首页即可看到')
      emit('saved', homeLayout)
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
.hl-tip { margin: 0 0 16px; font-size: 13px; line-height: 1.7; color: #8c8c8c; }
.hl-list { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
.hl-row { padding: 12px 16px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; }
.hl-row.is-off { opacity: 0.6; }
.hl-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hl-order {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; font-size: 12px; font-weight: 600; color: #fff;
  background: #1677ff; border-radius: 50%;
}
.hl-name { font-weight: 600; }
.hl-source { font-size: 12px; color: #8c8c8c; }
.hl-ops { margin-left: auto; }
.hl-body { display: grid; grid-template-columns: 1fr 1.6fr 180px; gap: 8px; margin-top: 10px; }
@media (max-width: 900px) { .hl-body { grid-template-columns: 1fr; } }
.hl-tone { width: 100%; }
.hl-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
</style>
