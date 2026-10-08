<template>
  <PageContainer>
    <div class="channel-manage">
      <div class="page-title">栏目管理</div>
      <div class="layout">
        <!-- 栏目树 -->
        <div class="tree-pane">
          <div class="pane-head">
            <span>栏目结构</span>
            <a-button type="primary" size="small" @click="openAdd(null)">
              <template #icon><PlusOutlined /></template>
              顶级栏目
            </a-button>
          </div>
          <a-spin :spinning="loadingTree">
            <a-tree
              :tree-data="treeData"
              :field-names="{ title: 'name', key: 'id', children: 'children' }"
              default-expand-all
              block-node
              draggable
              :allow-drop="allowTreeDrop"
              @select="onSelect"
              @dragstart="onTreeDragStart"
              @dragend="onTreeDragEnd"
              @drop="onTreeDrop"
            >
              <template #title="node">
                <span class="node-row">
                  <span class="node-main">
                    <span class="node-name" :class="{ 'node-hidden': node.hidden }">{{ node.name }}</span>
                    <a-tag v-if="node.hidden" class="node-hidden-tag">已隐藏</a-tag>
                    <a-tooltip title="按住拖动调整同级顺序">
                      <ControlOutlined class="node-drag-handle" />
                    </a-tooltip>
                  </span>
                  <a-switch
                    v-if="hideable(node)"
                    class="node-switch"
                    size="small"
                    :checked="!node.hidden"
                    :loading="toggling === node.id"
                    @click="(_v: boolean, e: Event) => e.stopPropagation()"
                    @change="(v: boolean) => onToggleEnabled(node, v)"
                  />
                  <span class="node-ops">
                    <PlusOutlined title="新增子栏目" @click.stop="openAdd(node.id)" />
                    <EditOutlined title="编辑" @click.stop="openEdit(node)" />
                    <DeleteOutlined v-if="canDelete(node)" title="删除" @click.stop="onDelete(node)" />
                  </span>
                </span>
              </template>
            </a-tree>
          </a-spin>
        </div>

        <!-- 编辑面板 -->
        <div class="form-pane">
          <a-empty v-if="!editing" description="选择左侧栏目查看/编辑，或新增栏目" style="margin-top: 80px" />
          <a-form v-else :model="form" :label-col="{ style: { width: '90px' } }">
            <a-form-item label="栏目名称" required>
              <a-input v-model:value="form.name" placeholder="请输入栏目名称" />
            </a-form-item>
            <a-form-item label="栏目标识">
              <a-input
                v-model:value="form.key"
                placeholder="小写字母开头，只含小写字母、数字与连字符，如 news-list"
                :disabled="!!form.id"
              />
            </a-form-item>
            <!-- 类型与上级栏目创建后不可改：后端不接收这两项，改了内容会与栏目失联 -->
            <a-form-item label="栏目类型" :extra="form.id ? '创建后不可修改' : undefined">
              <a-select v-model:value="form.type" :options="typeOptions" :disabled="!!form.id" />
            </a-form-item>
            <a-form-item
              label="上级栏目"
              :extra="form.id ? '创建后不可修改' : '不选则为后台顶级菜单；官网前台的一级页面固定，不会因此新增'"
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
            <a-form-item label="图标名称">
              <a-input v-model:value="form.icon" placeholder="Ant Design 图标名，如 HomeOutlined" />
            </a-form-item>
            <a-form-item v-if="form.type === 'list' || form.type === 'single'" label="编辑字段">
              <a-checkbox-group v-model:value="form.formFields" :options="fieldOptions" />
            </a-form-item>
            <a-form-item v-if="form.type === 'list'" label="列表列">
              <a-checkbox-group v-model:value="form.listColumns" :options="columnOptions" />
            </a-form-item>
            <!-- 首页板块：版式固定，不需要锚点与展示形态，只配两行标题 -->
            <template v-if="isHomeSection">
              <a-divider style="margin: 4px 0 16px">首页板块标题</a-divider>
              <div class="field-tip" style="margin: -8px 0 12px">上方「栏目名称」即板块小标题</div>
              <a-form-item label="板块主标题">
                <a-input v-model:value="form.subheading" placeholder="选填，留空时前台显示内置文案" :maxlength="100" />
              </a-form-item>
            </template>
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
                  选「视频」时，内容的视频字段作为播放源、封面图片作为播放前首帧
                </div>
              </a-form-item>
            </template>
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
                头图背景图片在「Banner管理」中按页面维护，此处只配文案
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
            </template>
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
import type { AntTreeNodeDropEvent, AntTreeNodeMouseEvent } from 'ant-design-vue/es/tree'
import type { DataNode } from 'ant-design-vue/es/vc-tree/interface'
import type { AllowDropOptions } from 'ant-design-vue/es/vc-tree/props'
import { PlusOutlined, EditOutlined, DeleteOutlined, ControlOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import {
  getChannelList, addChannel, updateChannel, deleteChannel,
  BLOCK_LAYOUT_OPTIONS, type BlockLayout, type Channel
} from '@/api/cms'
import { useChannels } from '@/composables/useChannels'
import { FIELD_DEFS, COLUMN_LABELS } from './fieldDefs'

const { load, channels } = useChannels()

const flat = ref<Channel[]>([])
// 全局栏目数据（标题就地改名、侧边栏刷新等处更新）变化时，树同步取最新名称
watch(channels, list => { if (list.length) flat.value = list })
const editing = ref(false)
const saving = ref(false)
const loadingTree = ref(false)

const typeOptions = [
  { label: '纯父级分组', value: 'group' },
  { label: '列表+编辑', value: 'list' },
  { label: '单条富文本', value: 'single' },
  { label: '基本信息', value: 'siteconfig' },
  { label: '管理员管理', value: 'admins' },
  { label: '会员管理', value: 'members' },
  { label: '意见反馈', value: 'feedback' },
  { label: '注册登录配置', value: 'authconfig' },
  { label: '登录日志', value: 'loginlog' }
]
const fieldOptions = Object.keys(FIELD_DEFS).map(k => ({ label: FIELD_DEFS[k].label, value: k }))
const columnOptions = Object.keys(COLUMN_LABELS).map(k => ({ label: COLUMN_LABELS[k], value: k }))
const layoutOptions = BLOCK_LAYOUT_OPTIONS

const defaultForm = () => ({
  id: undefined as number | undefined,
  parentId: null as number | null,
  key: '', name: '', type: 'list', icon: '', sort: 0, hidden: false,
  formFields: ['title', 'content', 'updateTime', 'isTop'] as string[],
  listColumns: ['title', 'createTime', 'isTop'] as string[],
  anchor: '', subheading: '', layout: undefined as BlockLayout | undefined,
  heroEyebrow: '', heroTitle: '', heroDesc: '',
  seoTitle: '', seoKeywords: '', seoDescription: ''
})
const form = reactive(defaultForm())

// SEO（TDK）仅对顶级公开板块页开放：排除系统类栏目与不对外的分组容器
// （Banner 管理、会员中心都是后台菜单分组，前台没有对应页面，配了 SEO 也不会输出）
const SEO_EXCLUDE_TYPES = [
  'siteconfig', 'admins',
  'members', 'feedback', 'authconfig', 'loginlog', 'oplog',
]
const SEO_EXCLUDE_KEYS = ['banner', 'member-center']

/** 后端拒删的系统功能栏目类型，须与 server channel.service.ts remove() 的清单一致 */
const UNDELETABLE_TYPES = [
  'siteconfig', 'admins', 'members', 'feedback', 'authconfig', 'loginlog', 'oplog',
]
/**
 * 是否显示删除入口：官网一级页面与系统栏目后端必拒，不给入口免得点了才被告知不行。
 * 「后代含系统栏目」这类需要查整棵树的情况仍交给后端判断并提示
 */
const canDelete = (node: Channel) => !node.portalPath && !UNDELETABLE_TYPES.includes(node.type)
const showSeo = computed(() =>
  form.parentId === null &&
  !SEO_EXCLUDE_TYPES.includes(form.type) &&
  !SEO_EXCLUDE_KEYS.includes(form.key)
)

// 启用/禁用对一级与二级栏目都开放，与后端 assertHideable 口径一致：
// 系统功能栏目禁用后会失去入口，首页是前台根路径
const hideable = (node: { type: string; portalPath?: string | null }) =>
  !UNDELETABLE_TYPES.includes(node.type) && node.portalPath !== '/'

const canHide = computed(() =>
  !!form.id && hideable({ type: form.type, portalPath: editingPortalPath.value })
)

// 栏目树上的就地开关：不必进编辑面板，一处集中管理所有栏目的启用状态
const toggling = ref<number | null>(null)
const onToggleEnabled = async (node: Channel, enabled: boolean) => {
  toggling.value = node.id
  try {
    const res = await updateChannel({ id: node.id, hidden: !enabled })
    if (res.data.code === 200) {
      message.success(enabled ? `已启用「${node.name}」` : `已禁用「${node.name}」`)
      await load(true) // 刷新树与侧边栏
    } else {
      message.error(res.data.message || '操作失败')
    }
  } catch {
    message.error('操作失败')
  } finally {
    toggling.value = null
  }
}

// 当前编辑节点的前台路径，仅用于判断是否展示头图配置，不参与提交
const editingPortalPath = ref('')

// 页面头图文案只对走通用栏目页模板的前台页面开放：
// 有 portalPath 才是前台页面；首页有独立首屏设计，不读栏目头图字段，配了也不生效
const HERO_EXCLUDE_KEYS = ['home']
const showHero = computed(() =>
  !!editingPortalPath.value && !HERO_EXCLUDE_KEYS.includes(form.key)
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

// 扁平 → 树
const treeData = computed(() => {
  type ChannelTreeNode = Channel & { children: ChannelTreeNode[] }
  const toTree = (parentId: number | null): ChannelTreeNode[] =>
    flat.value
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map(c => ({ ...c, children: toTree(c.id) }))
  return toTree(null)
})

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

const onSelect = (keys: (string | number)[]) => {
  if (!keys.length) return
  const node = flat.value.find(c => c.id === Number(keys[0]))
  if (node) openEdit(node)
}

// 仅允许同级排序：拖到节点之间的间隙（非放入节点内部），且与拖动节点同父
const allowTreeDrop = ({ dropNode, dropPosition }: AllowDropOptions<DataNode>) => {
  if (dropPosition === 0) return false // 0 = 放到节点内部，禁止改变层级
  const target = flat.value.find(c => c.id === dropNode.id)
  return !!target && target.parentId === draggingParentId
}

let draggingParentId: number | null = null
const onTreeDragStart = ({ node }: AntTreeNodeMouseEvent) => {
  const n = flat.value.find(c => c.id === node.id)
  draggingParentId = n ? n.parentId : null
}
// 拖拽结束（含取消）统一清空，避免残留值影响下一次 allowDrop 校验
const onTreeDragEnd = () => { draggingParentId = null }

// 拖拽放下：在同一父级内按新顺序重排并回写 sort
const onTreeDrop = async (info: AntTreeNodeDropEvent) => {
  try {
    const drag = flat.value.find(c => c.id === info.dragNode.id)
    const drop = flat.value.find(c => c.id === info.node.id)
    if (!drag || !drop || drag.parentId !== drop.parentId) return

    // 计算相对位置：>0 落在 drop 之后，<0 落在 drop 之前，0 放入内部（禁止）
    const dropPos = String(info.node.pos).split('-')
    const relative = info.dropPosition - Number(dropPos[dropPos.length - 1])
    if (relative === 0) return

    // 当前父级下的同级节点（按 sort 升序），移除拖动项后插入目标位置
    const siblings = flat.value
      .filter(c => c.parentId === drag.parentId)
      .sort((a, b) => a.sort - b.sort)
    const fromIdx = siblings.findIndex(c => c.id === drag.id)
    if (fromIdx === -1) return
    siblings.splice(fromIdx, 1)
    const dropIdx = siblings.findIndex(c => c.id === drop.id)
    if (dropIdx === -1) return // 目标已不在同级，放弃以防错位
    siblings.splice(relative > 0 ? dropIdx + 1 : dropIdx, 0, drag)

    // 重新分配连续 sort，仅回写变化项
    const changed: Channel[] = []
    siblings.forEach((c, i) => {
      const newSort = i + 1
      if (c.sort !== newSort) {
        c.sort = newSort
        changed.push(c)
      }
    })
    if (!changed.length) return

    try {
      await Promise.all(changed.map(c => updateChannel({ id: c.id, sort: c.sort })))
      message.success('排序已更新')
      await load(true) // 同步刷新侧边栏菜单
    } catch {
      message.error('排序更新失败')
      await fetchList()
    }
  } finally {
    draggingParentId = null
  }
}

const openAdd = (parentId: number | null) => {
  Object.assign(form, defaultForm())
  form.parentId = parentId
  // 新建栏目还没有前台路径，不展示头图配置
  editingPortalPath.value = ''
  editing.value = true
}

const openEdit = (node: Channel) => {
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
    heroEyebrow: node.heroEyebrow || '',
    heroTitle: node.heroTitle || '',
    heroDesc: node.heroDesc || '',
    seoTitle: node.seoTitle || '',
    seoKeywords: node.seoKeywords || '',
    seoDescription: node.seoDescription || ''
  })
  editing.value = true
}

const onSave = async () => {
  if (!form.name.trim()) {
    message.error('请输入栏目名称')
    return
  }
  saving.value = true
  try {
    const payload = { ...form }
    // 非顶级板块页不保存 SEO 字段，避免污染子栏目数据
    if (!showSeo.value) {
      const seoPayload = payload as Partial<typeof payload>
      delete seoPayload.seoTitle
      delete seoPayload.seoKeywords
      delete seoPayload.seoDescription
    }
    // 不展示头图表单的栏目（子栏目、系统栏目、首页）不提交头图字段
    if (!showHero.value) {
      const heroPayload = payload as Partial<typeof payload>
      delete heroPayload.heroEyebrow
      delete heroPayload.heroTitle
      delete heroPayload.heroDesc
    }
    // 首页板块只提交主标题：锚点与展示形态界面上不展示，提交空值会把库里的值清掉
    if (isHomeSection.value) {
      const homePayload = payload as Partial<typeof payload>
      delete homePayload.anchor
      delete homePayload.layout
    } else if (!showBlockConfig.value) {
      // 顶级栏目本身是页面不是区块，不保存区块字段
      const blockPayload = payload as Partial<typeof payload>
      delete blockPayload.anchor
      delete blockPayload.subheading
      delete blockPayload.layout
    }
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
.channel-manage {
  background: transparent;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
}

.node-hidden {
  color: #bfbfbf;
}

.node-hidden-tag {
  margin-left: 8px;
}

.layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.tree-pane {
  width: 380px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
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

/* 树节点就地启用开关：与操作图标一样，仅鼠标移入时显示 */
.node-switch {
  display: none;
  margin-right: 10px;
}

.node-row:hover .node-switch {
  display: inline-block;
}

.node-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.node-main {
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.node-drag-handle {
  color: #bfbfbf;
  font-size: 14px;
  cursor: grab;
}

.node-drag-handle:hover {
  color: #2f7cff;
}

.node-drag-handle:active {
  cursor: grabbing;
}

.node-ops {
  display: none;
  gap: 10px;
  color: #8c8c8c;
}

.node-ops .anticon:hover {
  color: #2f7cff;
}

.node-row:hover .node-ops {
  display: inline-flex;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
