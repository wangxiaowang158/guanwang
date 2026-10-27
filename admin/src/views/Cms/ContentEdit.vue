<template>
  <PageContainer>
    <div class="content-edit">
      <div class="edit-head">
        <div class="title">{{ channel?.name || '编辑' }}</div>
        <a-space>
          <!-- 预览已保存的版本（含草稿）；本页未保存的改动要先保存才看得到 -->
          <PreviewPageButton v-if="channel && contentId" :channel-key="channel.key" />
          <!-- 历史版本只对已存在的内容有意义；新增时还没有任何版本 -->
          <a-button v-if="contentId" @click="revisionOpen = true">
            <template #icon><HistoryOutlined /></template>
            历史版本
          </a-button>
          <a-button @click="goBack">返回</a-button>
        </a-space>
      </div>
      <RevisionDrawer
        v-if="contentId"
        v-model:open="revisionOpen"
        :channel-key="channelKey"
        :content-id="contentId"
        @restored="onRevisionRestored"
      />
      <a-breadcrumb class="crumb">
        <a-breadcrumb-item v-for="n in crumbNames" :key="n">{{ n }}</a-breadcrumb-item>
      </a-breadcrumb>

      <div class="form-card">
        <ContentForm
          v-if="channel"
          :fields="channel.formFields"
          :channel-key="channel.key"
          v-model:model="model"
          v-model:extra="extraDraft"
          :saving="saving"
          :field-options="fieldOptions"
          show-back
          show-publish-at
          @save="onSave"
          @back="goBack"
        />
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// list 栏目的新增/编辑全页表单
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import { useChannels } from '@/composables/useChannels'
import { useUnsavedGuard } from '@/composables/useUnsavedGuard'
import { HistoryOutlined } from '@ant-design/icons-vue'
import PreviewPageButton from './components/PreviewPageButton.vue'
import RevisionDrawer from './components/RevisionDrawer.vue'
import {
  getContentDetail, getContentList, saveContent,
  type Channel, type Content, type ContentExtra, type ContentFormModel,
} from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import { categorySourceOf } from './categorySources'
import ContentForm from './ContentForm.vue'
import { draftToExtra, emptyDraft, extraToDraft } from './components/extra/extraDraft'
import { isExtraField } from './fieldDefs'

const route = useRoute()
const router = useRouter()
const { load, findByKey, ancestors } = useChannels()

const channelKey = route.params.channelKey as string
const contentId = route.params.id ? Number(route.params.id) : undefined

const channel = ref<Channel | null>(null)
const model = ref<ContentFormModel>({})
// 扩展字段草稿（content.extra），与 model 分开持有；originalExtra 用于保存时保留未启用字段的旧值
const extraDraft = ref(emptyDraft())
const originalExtra = ref<ContentExtra | null>(null)
const saving = ref(false)
/** 编辑已有内容时的详情加载状态；加载失败不能放行保存，否则会用空表单新建出一条重复记录 */
const loadState = ref<'loading' | 'ready' | 'failed'>('loading')
// 下拉字段选项，目前只有「产品类别」需要，取自对应分类栏目的条目名
const fieldOptions = ref<Record<string, { label: string; value: string }[]>>({})

/** 分类栏目条目数上限：分类是运营手工维护的少量枚举，一次取够即可 */
const CATEGORY_OPTION_LIMIT = 200

/**
 * 载入「产品类别」下拉的选项
 * 取对应分类栏目下的已发布条目名；该栏目没配或没内容时留空，
 * 由表单把控件置灰并提示先去录分类
 */
async function loadCategoryOptions(): Promise<void> {
  const sourceKey = categorySourceOf(channelKey)
  if (!sourceKey) return
  try {
    const res = await getContentList({
      channelKey: sourceKey,
      status: 'published',
      page: 1,
      pageSize: CATEGORY_OPTION_LIMIT,
    })
    if (res.data.code !== 200 || !res.data.data) return
    const options = res.data.data.list
      // 分类栏目有的用 title 有的用 name 存名称，两者取其一
      .map(item => (item.title || item.name || '').trim())
      .filter(Boolean)
      .map(label => ({ label, value: label }))
    fieldOptions.value = { ...fieldOptions.value, category: options }
  } catch {
    // 取不到选项不阻断表单：其余字段仍可编辑，类别留空即前台不参与筛选
  }
}

const crumbNames = computed(() => channel.value ? ancestors(channel.value.key).map(c => c.name) : [])

/**
 * 返回列表：带上进入编辑页时列表的页码与筛选（列表跳过来时放在 query.from 里），
 * 回去仍停在原来那一页，不用重新翻页筛选
 */
const goBack = () => {
  const from = typeof route.query.from === 'string' ? route.query.from : ''
  // 只认本栏目列表地址，防止被拼进站外或其它页面的地址
  const listPath = `/cms/${channelKey}`
  router.push(from.startsWith(`${listPath}?`) || from === listPath ? from : listPath)
}

// 离开拦截的比对口径：表单顶层字段 + 扩展字段草稿；model 为空表示还没载入完
const { markSaved } = useUnsavedGuard(() =>
  loadState.value === 'ready' ? { model: model.value, extra: extraDraft.value } : null
)

onMounted(async () => {
  await load()
  channel.value = findByKey(channelKey) || null
  // 与详情并行：两者无依赖关系，串起来会让表单多等一个往返
  void loadCategoryOptions()
  // 初始化表单默认值：新增默认草稿，点「发布到官网」才上线，避免半成品误发
  const base: ContentFormModel = {
    channelKey, author: '管理员', source: '本站', isTop: false, status: 'draft'
  }
  if (contentId) await loadDetail(base)
  model.value = base
  if (loadState.value === 'loading') loadState.value = 'ready'
  // 等子组件把初值规整完（富文本会回写一次 HTML）再记基准，否则一进来就算「有改动」
  await nextTick()
  markSaved()
})

/**
 * 取详情并合并进表单初值；失败时置 failed，阻止保存
 * @param base 表单初值，就地合并
 */
async function loadDetail(base: ContentFormModel): Promise<void> {
  if (!contentId) return
  try {
    const res = await getContentDetail({ channelKey, id: contentId })
    if (res.data.code === 200 && res.data.data) {
      const { extra, ...rest } = res.data.data
      Object.assign(base, rest)
      originalExtra.value = extra ?? null
      extraDraft.value = extraToDraft(extra)
    } else {
      loadState.value = 'failed'
      message.error(res.data.message || '内容加载失败，请返回刷新重试')
    }
  } catch {
    loadState.value = 'failed'
    message.error('内容加载失败，请返回刷新重试')
  }
}

/** 历史版本抽屉 */
const revisionOpen = ref(false)

/**
 * 恢复历史版本后重新载入表单
 * 恢复已直接写库，本页未保存的改动随之作废；重新记基准，免得离开时误报「有未保存修改」
 */
const onRevisionRestored = async () => {
  const base: ContentFormModel = { channelKey }
  await loadDetail(base)
  if (loadState.value === 'failed') return
  model.value = base
  await nextTick()
  markSaved()
}

const onSave = async (status: 'published' | 'draft') => {
  // 防连点：表单校验是异步的，saving 要等校验结束才置位，连点两次会各发一次保存
  if (saving.value) return
  if (loadState.value === 'failed') {
    message.warning('内容加载失败，请返回刷新页面后再保存')
    return
  }
  saving.value = true
  try {
    // 富文本内容保存前净化，防存储型 XSS
    const payload: Partial<Content> & { channelKey: string } = { ...model.value, channelKey, status }
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    // 清空选择器得到的是 null/undefined，undefined 在 JSON 里会被丢掉，后端据此「保持原值」，
    // 清不掉已设的发布时间。统一发空串，后端按「清空、回落创建日期」处理
    payload.publishAt = payload.publishAt || ''
    // 栏目没启用任何扩展字段时不带 extra：后端据此保持原值，不会误清
    const extraKeys = (channel.value?.formFields ?? []).filter(isExtraField)
    if (extraKeys.length) payload.extra = draftToExtra(extraDraft.value, extraKeys, originalExtra.value)
    const res = await saveContent(payload)
    if (res.data.code === 200) {
      // 告诉运营结果在哪看：发布即刻生效，草稿官网不显示
      message.success(status === 'published'
        ? '已发布，刷新官网即可看到'
        : '已存为草稿，官网不显示；可在列表点「预览页面」查看效果')
      model.value.status = status
      markSaved()
      goBack()
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
.content-edit {
  background: transparent;
}

.edit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.crumb {
  margin: 8px 0 16px;
}

.form-card {
  background: #fff;
  border-radius: 8px;
  padding: 28px 24px;
}
</style>
