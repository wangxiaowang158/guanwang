<template>
  <PageContainer>
    <div class="channel-manage">
      <div class="page-title">栏目管理</div>
      <div class="layout">
        <ChannelTree
          :flat="flat"
          :loading="loadingTree"
          @add="openAdd"
          @edit="openEdit"
          @remove="onDelete"
          @changed="load(true)"
          @failed="fetchList"
        />

        <!-- 编辑面板 -->
        <div class="form-pane">
          <a-empty v-if="!editing" description="选择左侧栏目查看/编辑，或新增栏目" style="margin-top: 80px" />
          <a-form v-else :model="form" :label-col="{ style: { width: '90px' } }">
            <a-form-item label="栏目名称" required>
              <a-input v-model:value="form.name" placeholder="请输入栏目名称" />
            </a-form-item>
            <!-- 类型与上级栏目创建后不可改：后端不接收这两项，改了内容会与栏目失联 -->
            <a-form-item label="栏目类型" :extra="form.id ? '创建后不可修改' : undefined">
              <a-select v-model:value="form.type" :options="typeOptions" :disabled="!!form.id" />
            </a-form-item>
            <a-form-item
              label="上级栏目"
              :extra="form.id ? '创建后不可修改' : '不选则为一级栏目（可在下方设为官网页面）；选了则为该页面里的一个区块'"
            >
              <a-tree-select
                v-model:value="form.parentId"
                :disabled="!!form.id"
                :tree-data="treeData"
                :field-names="{ label: 'name', value: 'id', children: 'children' }"
                placeholder="不选则为顶级"
                allow-clear
                tree-default-expand-all
              />
            </a-form-item>
            <a-form-item v-if="canHide" label="启用状态" extra="关闭后，该栏目在后台菜单和官网前台都不再显示，内容数据保留，随时可重新启用">
              <a-switch
                :checked="!form.hidden"
                checked-children="启用"
                un-checked-children="禁用"
                @change="(v: boolean) => (form.hidden = !v)"
              />
            </a-form-item>
            <!-- 首页板块：版式固定；标题统一在「首页布局」里改，这里不再重复提供入口 -->
            <a-alert
              v-if="isHomeSection"
              type="info"
              show-icon
              class="home-tip"
              message="首页板块的标题、顺序、显隐与底色，请到「基本信息管理 → 首页布局」中修改"
            />
            <!-- 前台区块配置：子栏目会作为父页面的一个内容区块呈现 -->
            <template v-else-if="showBlockConfig">
              <a-divider style="margin: 4px 0 16px">前台区块</a-divider>
              <a-form-item label="区块锚点">
                <a-input
                  v-model:value="form.anchor"
                  placeholder="小写字母、数字与连字符，如 company-video"
                  :maxlength="64"
                />
                <div class="field-tip">留空则该栏目内容不在前台页面上呈现</div>
              </a-form-item>
              <a-form-item label="区块副标题">
                <a-input v-model:value="form.subheading" placeholder="选填，显示在区块标题下方" :maxlength="300" />
              </a-form-item>
              <a-form-item label="展示形态">
                <a-select v-model:value="form.layout" :options="layoutOptions" placeholder="默认图标卡片" allow-clear />
                <div class="field-tip">
                  选「视频」时，内容的视频字段作为播放源、封面图片作为播放前首帧；
                  「图片/视频展示」每条内容一张大图或一段视频，按原比例完整显示；
                  「品牌介绍」用副标题作口号、正文作品牌故事；
                  痛点、流程、看板、合作模式、证言、图集这几种，数据取自内容的对应扩展字段
                </div>
              </a-form-item>
              <a-form-item label="菜单分组">
                <a-input v-model:value="form.menuGroup" placeholder="选填，如：三大业务" :maxlength="50" />
                <div class="field-tip">前台超级下拉菜单里，同分组名的子项归为一列；留空则按单列展示</div>
              </a-form-item>
              <a-form-item label="菜单说明">
                <a-input v-model:value="form.menuDesc" placeholder="选填，显示在菜单项下方的一句话" :maxlength="100" />
              </a-form-item>
              <BlockAppearanceFields v-model="form" />
            </template>
            <!-- 官网页面：一级栏目可设为站内页面（路径 + 菜单挂靠 + 头图素材）或导航外链 -->
            <ChannelPageFields v-if="showPageFields" :key="formSeq" ref="pageFieldsRef" v-model="form" :channels="flat" />
            <!-- 页面头图文案：走通用栏目页模板的板块可填，对应前台页面顶部 -->
            <template v-if="showHero">
              <a-divider style="margin: 4px 0 16px">页面头图</a-divider>
              <a-form-item label="眉标题">
                <a-input v-model:value="form.heroEyebrow" placeholder="选填，显示在主标题上方" :maxlength="100" />
              </a-form-item>
              <a-form-item label="主标题">
                <a-input v-model:value="form.heroTitle" placeholder="留空则使用栏目名称" :maxlength="200" />
              </a-form-item>
              <a-form-item label="头图描述">
                <a-textarea v-model:value="form.heroDesc" placeholder="选填，显示在主标题下方" :rows="3" :maxlength="1000" />
              </a-form-item>
              <div class="field-tip" style="margin: -8px 0 16px">
                头图背景图与视频在上方「官网页面」里上传；未上传时沿用「Banner管理」里该页面的头图
              </div>
            </template>
            <!-- SEO 信息（TDK）：仅顶级板块页可填，用于前台页面搜索引擎优化 -->
            <template v-if="showSeo">
              <a-divider style="margin: 4px 0 16px">SEO 信息（TDK）</a-divider>
              <a-form-item label="SEO 标题">
                <a-input v-model:value="form.seoTitle" placeholder="搜索结果标题，建议 60 字以内" :maxlength="100" />
              </a-form-item>
              <a-form-item label="SEO 关键词">
                <a-input v-model:value="form.seoKeywords" placeholder="多个关键词用英文逗号分隔" :maxlength="200" />
              </a-form-item>
              <a-form-item label="SEO 描述">
                <a-textarea v-model:value="form.seoDescription" placeholder="搜索结果摘要，建议 150 字以内" :rows="3" :maxlength="500" show-count />
              </a-form-item>
              <!-- 未填 SEO 标题时前台用网站名称，这里同口径回落，预览才与实际一致 -->
              <SeoPreview
                class="seo-preview-gap"
                :title="form.seoTitle || form.name"
                :description="form.seoDescription"
                :image="form.heroBg"
                :url="form.portalPath || editingPortalPath"
              />
            </template>
            <ChannelAdvancedFields :key="formSeq" v-model="form" />
            <a-form-item :wrapper-col="{ offset: 0 }" class="form-actions">
              <a-space>
                <a-button type="primary" :loading="saving" @click="onSave">保存</a-button>
                <a-button @click="editing = false">取消</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// 栏目管理：可视化增删改菜单结构与字段配置
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import {
  getChannelList, addChannel, updateChannel, deleteChannel,
  BLOCK_LAYOUT_OPTIONS, LAYOUT_DEFAULT_FIELDS, type BlockLayout, type BlockTone, type Channel
} from '@/api/cms'
import { useChannels } from '@/composables/useChannels'
import { pruneChannelPayload } from './channelPayload'
import { hideable } from './channelRules'
import ChannelTree from './components/ChannelTree.vue'
import ChannelPageFields from './components/ChannelPageFields.vue'
import BlockAppearanceFields from './components/BlockAppearanceFields.vue'
import ChannelAdvancedFields from './components/ChannelAdvancedFields.vue'
import SeoPreview from '@/components/SeoPreview/index.vue'

const { load, channels } = useChannels()

const flat = ref<Channel[]>([])
// 全局栏目数据（标题就地改名、侧边栏刷新等处更新）变化时，树同步取最新名称
watch(channels, list => { if (list.length) flat.value = list })
const editing = ref(false)
const saving = ref(false)
const loadingTree = ref(false)

const typeOptions = [
  { label: '分组（只用来归类，本身无内容）', value: 'group' },
  { label: '多条内容（如新闻、产品、案例）', value: 'list' },
  { label: '单页内容（如公司简介）', value: 'single' },
  { label: '基本信息', value: 'siteconfig' },
  { label: '管理员管理', value: 'admins' },
  { label: '会员管理', value: 'members' },
  { label: '意见反馈', value: 'feedback' },
  { label: '注册登录配置', value: 'authconfig' },
  { label: '登录日志', value: 'loginlog' }
]
const layoutOptions = BLOCK_LAYOUT_OPTIONS

const defaultForm = () => ({
  id: undefined as number | undefined,
  parentId: null as number | null,
  key: '', name: '', type: 'list', icon: '', sort: 0, hidden: false,
  formFields: ['title', 'content', 'updateTime', 'isTop'] as string[],
  listColumns: ['title', 'createTime', 'isTop'] as string[],
  anchor: '', subheading: '', layout: undefined as BlockLayout | undefined,
  menuGroup: '', menuDesc: '',
  heroEyebrow: '', heroTitle: '', heroDesc: '',
  seoTitle: '', seoKeywords: '', seoDescription: '',
  // 官网页面字段（仅一级栏目）
  portalPath: '', menuParent: undefined as string | undefined, externalUrl: '', heroBg: '', heroVideo: '',
  // 区块外观（仅区块子栏目）：auto / 0 / 空串 即模板默认
  blockTone: 'auto' as BlockTone, blockBg: '', blockColumns: 0, headingAlign: '' as '' | 'center' | 'left'
})
const form = reactive(defaultForm())

/** 系统功能栏目：没有官网页面 */
const SYSTEM_TYPES = ['siteconfig', 'admins', 'members', 'feedback', 'authconfig', 'loginlog', 'oplog']
/** 只做后台菜单分组、不对应官网页面的一级栏目 */
const NON_PAGE_KEYS = ['banner', 'member-center']
// 官网页面配置只对一级内容栏目开放
const showPageFields = computed(() =>
  form.parentId === null && !SYSTEM_TYPES.includes(form.type) && !NON_PAGE_KEYS.includes(form.key)
)

// SEO（TDK）仅对顶级公开板块页开放：排除系统类栏目与不对外的分组容器
// （Banner 管理、会员中心都是后台菜单分组，前台没有对应页面，配了 SEO 也不会输出）
const SEO_EXCLUDE_TYPES = [
  'siteconfig', 'admins',
  'members', 'feedback', 'authconfig', 'loginlog', 'oplog',
]
const SEO_EXCLUDE_KEYS = ['banner', 'member-center']

const showSeo = computed(() =>
  form.parentId === null &&
  !SEO_EXCLUDE_TYPES.includes(form.type) &&
  !SEO_EXCLUDE_KEYS.includes(form.key)
)

const canHide = computed(() =>
  !!form.id && hideable({ type: form.type, portalPath: editingPortalPath.value })
)

// 当前编辑节点的前台路径，仅用于判断是否展示头图配置，不参与提交
const editingPortalPath = ref('')

// 页面头图文案只对走通用栏目页模板的前台页面开放：
// 有 portalPath 才是前台页面；首页有独立首屏设计，不读栏目头图字段，配了也不生效
const HERO_EXCLUDE_KEYS = ['home']
// 跟随表单里正在编辑的路径：新建页面填了路径即可同时配头图文案
const showHero = computed(() =>
  form.parentId === null && !!(form.portalPath || editingPortalPath.value) && !HERO_EXCLUDE_KEYS.includes(form.key)
)

/** 是否首页板块栏目（父级为 home）：前台由固定版式渲染，只有标题可配 */
const isHomeSection = computed(() => {
  const parent = flat.value.find(c => c.id === form.parentId)
  return parent?.key === 'home'
})

// 区块配置只对「挂在某个页面下的内容栏目」开放：
// 顶级栏目本身是页面而非区块，系统类栏目不进前台
const showBlockConfig = computed(() =>
  form.parentId !== null &&
  (form.type === 'list' || form.type === 'single')
)

const fetchList = async () => {
  loadingTree.value = true
  try {
    const res = await getChannelList()
    if (res.data.code === 200) flat.value = res.data.data
    else message.error(res.data.message || '栏目加载失败')
  } catch {
    message.error('栏目加载失败，请刷新重试')
  } finally {
    loadingTree.value = false
  }
}

// 上级栏目下拉用的树（扁平 → 树）
const treeData = computed(() => {
  type ChannelTreeNode = Channel & { children: ChannelTreeNode[] }
  const toTree = (parentId: number | null): ChannelTreeNode[] =>
    flat.value
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map(c => ({ ...c, children: toTree(c.id) }))
  return toTree(null)
})

// 新建区块选定展示形态时，按形态自动勾选它会用到的内容字段（已建栏目不动，尊重已有配置）
watch(() => form.layout, (layout) => {
  if (form.id || !layout) return
  const fields = LAYOUT_DEFAULT_FIELDS[layout]
  if (fields) form.formFields = [...fields]
})

/** 每次打开编辑面板递增，作为页面配置组件的 key 强制重建，重新推断页面类型 */
const formSeq = ref(0)
const pageFieldsRef = ref<InstanceType<typeof ChannelPageFields>>()

const openAdd = (parentId: number | null) => {
  formSeq.value += 1
  Object.assign(form, defaultForm())
  form.parentId = parentId
  // 新建栏目还没有前台路径，不展示头图配置
  editingPortalPath.value = ''
  editing.value = true
}

const openEdit = (node: Channel) => {
  formSeq.value += 1
  editingPortalPath.value = node.portalPath || ''
  Object.assign(form, defaultForm(), {
    id: node.id,
    parentId: node.parentId,
    key: node.key,
    name: node.name,
    type: node.type,
    icon: node.icon || '',
    hidden: !!node.hidden,
    sort: node.sort,
    formFields: node.formFields ? [...node.formFields] : [],
    listColumns: node.listColumns ? [...node.listColumns] : [],
    anchor: node.anchor || '',
    subheading: node.subheading || '',
    layout: node.layout,
    menuGroup: node.menuGroup || '',
    menuDesc: node.menuDesc || '',
    heroEyebrow: node.heroEyebrow || '',
    heroTitle: node.heroTitle || '',
    heroDesc: node.heroDesc || '',
    seoTitle: node.seoTitle || '',
    seoKeywords: node.seoKeywords || '',
    seoDescription: node.seoDescription || '',
    portalPath: node.portalPath || '',
    menuParent: node.menuParent || undefined,
    externalUrl: node.externalUrl || '',
    heroBg: node.heroBg || '',
    heroVideo: node.heroVideo || '',
    blockTone: node.blockTone || 'auto',
    blockBg: node.blockBg || '',
    blockColumns: node.blockColumns || 0,
    headingAlign: node.headingAlign || ''
  })
  editing.value = true
}

const onSave = async () => {
  if (!form.name.trim()) {
    message.error('请输入栏目名称')
    return
  }
  if (!form.id && !form.key.trim()) {
    message.error('请在「高级设置」里填写栏目标识')
    return
  }
  const block = showBlockConfig.value && !isHomeSection.value
  if (block && form.blockTone === 'image' && !form.blockBg) {
    message.error('区块底色选了「背景图」，请上传背景图')
    return
  }
  if (showPageFields.value) {
    const pageError = pageFieldsRef.value?.validate()
    if (pageError) {
      message.error(pageError)
      return
    }
  }
  saving.value = true
  try {
    // 界面上没展示的字段不提交，否则默认空值会把库里已有的值清掉
    const payload = pruneChannelPayload(form, {
      seo: showSeo.value,
      hero: showHero.value,
      homeSection: isHomeSection.value,
      block: showBlockConfig.value,
      page: showPageFields.value
    })
    const res = payload.id
      ? await updateChannel(payload as Channel)
      : await addChannel(payload as Partial<Channel>)
    if (res.data.code === 200) {
      message.success('保存成功')
      editing.value = false
      await fetchList()
      await load(true) // 刷新侧边栏菜单
    } else {
      message.error(res.data.message || '保存失败')
    }
  } catch {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

const onDelete = (node: Channel) => {
  Modal.confirm({
    title: `确认删除栏目「${node.name}」？`,
    content: '其下所有子栏目将一并删除，且不可恢复。',
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        const res = await deleteChannel(node.id)
        // 后端异常恒回 HTTP 200，须按 code 判断，否则被拒绝删除也会提示成功
        if (res.data.code !== 200) {
          message.error(res.data.message || '删除失败')
          return
        }
        message.success('删除成功')
        editing.value = false
        await fetchList()
        await load(true)
      } catch {
        message.error('删除失败')
      }
    }
  })
}

onMounted(fetchList)
</script>

<style scoped>
.seo-preview-gap {
  margin-bottom: 16px;
}

.channel-manage {
  background: transparent;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
}

.layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.form-pane {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  min-height: 400px;
}

/* 保存/取消按钮左对齐，与上方输入框起点一致（标签列宽 90px + 冒号间距） */
.form-actions :deep(.ant-form-item-control-input-content) {
  display: flex;
  justify-content: flex-start;
  padding-left: 100px;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}

.home-tip {
  margin-bottom: 16px;
}
</style>
