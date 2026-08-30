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
                    <span class="node-name">{{ node.name }}</span>
                    <a-tooltip title="按住拖动调整同级顺序">
                      <ControlOutlined class="node-drag-handle" />
                    </a-tooltip>
                  </span>
                  <span class="node-ops">
                    <PlusOutlined title="新增子栏目" @click.stop="openAdd(node.id)" />
                    <EditOutlined title="编辑" @click.stop="openEdit(node)" />
                    <DeleteOutlined title="删除" @click.stop="onDelete(node)" />
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
              <a-input v-model:value="form.key" placeholder="路由标识，留空自动生成" :disabled="!!form.id" />
            </a-form-item>
            <a-form-item label="栏目类型">
              <a-select v-model:value="form.type" :options="typeOptions" />
            </a-form-item>
            <a-form-item label="上级栏目">
              <a-tree-select
                v-model:value="form.parentId"
                :tree-data="treeData"
                :field-names="{ label: 'name', value: 'id', children: 'children' }"
                placeholder="不选则为顶级"
                allow-clear
                tree-default-expand-all
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
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, ControlOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import {
  getChannelList, addChannel, updateChannel, deleteChannel, type Channel
} from '@/api/cms'
import { useChannels } from '@/composables/useChannels'
import { FIELD_DEFS, COLUMN_LABELS } from './fieldDefs'

const { load } = useChannels()

const flat = ref<Channel[]>([])
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

const defaultForm = () => ({
  id: undefined as number | undefined,
  parentId: null as number | null,
  key: '', name: '', type: 'list', icon: '', sort: 0,
  formFields: ['title', 'content', 'updateTime', 'isTop'] as string[],
  listColumns: ['title', 'createTime', 'isTop'] as string[],
  seoTitle: '', seoKeywords: '', seoDescription: ''
})
const form = reactive(defaultForm())

// SEO（TDK）仅对顶级公开板块页开放：排除系统类栏目与 Banner 容器
const SEO_EXCLUDE_TYPES = [
  'siteconfig', 'admins',
  'members', 'feedback', 'authconfig', 'loginlog',
]
const SEO_EXCLUDE_KEYS = ['banner']
const showSeo = computed(() =>
  form.parentId === null &&
  !SEO_EXCLUDE_TYPES.includes(form.type) &&
  !SEO_EXCLUDE_KEYS.includes(form.key)
)

// 扁平 → 树
const treeData = computed(() => {
  const toTree = (parentId: number | null): any[] =>
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
const allowTreeDrop = ({ dropNode, dropPosition }: any) => {
  if (dropPosition === 0) return false // 0 = 放到节点内部，禁止改变层级
  const target = flat.value.find(c => c.id === dropNode.id)
  return !!target && target.parentId === draggingParentId
}

let draggingParentId: number | null = null
const onTreeDragStart = ({ node }: any) => {
  const n = flat.value.find(c => c.id === node.id)
  draggingParentId = n ? n.parentId : null
}
// 拖拽结束（含取消）统一清空，避免残留值影响下一次 allowDrop 校验
const onTreeDragEnd = () => { draggingParentId = null }

// 拖拽放下：在同一父级内按新顺序重排并回写 sort
const onTreeDrop = async (info: any) => {
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
  editing.value = true
}

const openEdit = (node: Channel) => {
  Object.assign(form, defaultForm(), {
    id: node.id,
    parentId: node.parentId,
    key: node.key,
    name: node.name,
    type: node.type,
    icon: node.icon || '',
    sort: node.sort,
    formFields: node.formFields ? [...node.formFields] : [],
    listColumns: node.listColumns ? [...node.listColumns] : [],
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
        await deleteChannel(node.id)
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

/* 保存/取消按钮右对齐 */
.form-actions :deep(.ant-form-item-control-input-content) {
  display: flex;
  justify-content: flex-end;
}

.node-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.node-main {
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
</style>
