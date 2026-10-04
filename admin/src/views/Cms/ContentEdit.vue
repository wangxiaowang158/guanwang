<template>
  <PageContainer>
    <div class="content-edit">
      <div class="edit-head">
        <div class="title">{{ channel?.name || '编辑' }}</div>
        <a-button @click="goBack">返回</a-button>
      </div>
      <a-breadcrumb class="crumb">
        <a-breadcrumb-item v-for="n in crumbNames" :key="n">{{ n }}</a-breadcrumb-item>
      </a-breadcrumb>

      <div class="form-card">
        <ContentForm
          v-if="channel"
          :fields="channel.formFields"
          :channel-key="channel.key"
          :model="model"
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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import { useChannels } from '@/composables/useChannels'
import { getContentDetail, getContentList, saveContent, type Channel, type Content } from '@/api/cms'
import { sanitizeHtml } from '@/utils/sanitize'
import { categorySourceOf } from './categorySources'
import ContentForm from './ContentForm.vue'

const route = useRoute()
const router = useRouter()
const { load, findByKey, ancestors } = useChannels()

const channelKey = route.params.channelKey as string
const contentId = route.params.id ? Number(route.params.id) : undefined

const channel = ref<Channel | null>(null)
const model = ref<Record<string, any>>({})
const saving = ref(false)
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

const goBack = () => router.push(`/cms/${channelKey}`)

onMounted(async () => {
  await load()
  channel.value = findByKey(channelKey) || null
  // 与详情并行：两者无依赖关系，串起来会让表单多等一个往返
  void loadCategoryOptions()
  // 初始化表单默认值
  // 新增默认已发布：沿用「填完即上线」的既有习惯，需要暂存时手动改草稿
  const base: Record<string, any> = {
    channelKey, author: '管理员', source: '本站', isTop: false, status: 'published'
  }
  if (contentId) {
    const res = await getContentDetail({ channelKey, id: contentId })
    if (res.data.code === 200 && res.data.data) {
      Object.assign(base, res.data.data)
    }
  }
  model.value = base
})

const onSave = async () => {
  saving.value = true
  try {
    // 富文本内容保存前净化，防存储型 XSS
    const payload: Partial<Content> & { channelKey: string } = { ...model.value, channelKey }
    if (payload.content) payload.content = sanitizeHtml(payload.content)
    // 清空选择器得到的是 null/undefined，undefined 在 JSON 里会被丢掉，后端据此「保持原值」，
    // 清不掉已设的发布时间。统一发空串，后端按「清空、回落创建日期」处理
    payload.publishAt = payload.publishAt || ''
    const res = await saveContent(payload)
    if (res.data.code === 200) {
      message.success('保存成功')
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
