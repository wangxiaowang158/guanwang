<template>
  <!-- 栏目树：拖拽同级排序、就地启用开关、新增/编辑/删除入口 -->
  <div class="tree-pane">
    <div class="pane-head">
      <span>栏目结构</span>
      <a-button type="primary" size="small" @click="emit('add', null)">
        <template #icon><PlusOutlined /></template>
        顶级栏目
      </a-button>
    </div>
    <p class="pane-tip">拖动调整顺序即官网导航顺序；开关控制是否在官网显示</p>
    <a-spin :spinning="loading">
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
              :aria-label="`在官网显示 ${node.name}`"
              @click="(_v: boolean, e: Event) => e.stopPropagation()"
              @change="(v: boolean) => onToggleEnabled(node, v)"
            />
            <span class="node-ops">
              <PlusOutlined title="新增子栏目" @click.stop="emit('add', node.id)" />
              <EditOutlined title="编辑" @click.stop="emit('edit', node)" />
              <DeleteOutlined v-if="canDelete(node)" title="删除" @click.stop="emit('remove', node)" />
            </span>
          </span>
        </template>
      </a-tree>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
// 栏目管理左侧树：只负责展示与树上的就地操作，编辑表单由父组件承载
import { computed, ref, toRef } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, ControlOutlined } from '@ant-design/icons-vue'
import { updateChannel, type Channel } from '@/api/cms'
import { canDelete, hideable } from '../channelRules'
import { useChannelTreeSort } from '../composables/useChannelTreeSort'

const props = defineProps<{ flat: Channel[]; loading: boolean }>()
const emit = defineEmits<{
  add: [parentId: number | null]
  edit: [node: Channel]
  remove: [node: Channel]
  /** 树上的改动已写库，父组件刷新列表与侧边栏 */
  changed: []
  /** 写库失败，父组件重新拉取以纠正本地状态 */
  failed: []
}>()

// 扁平 → 树
const treeData = computed(() => {
  type ChannelTreeNode = Channel & { children: ChannelTreeNode[] }
  const toTree = (parentId: number | null): ChannelTreeNode[] =>
    props.flat
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map(c => ({ ...c, children: toTree(c.id) }))
  return toTree(null)
})

const onSelect = (keys: (string | number)[]) => {
  if (!keys.length) return
  const node = props.flat.find(c => c.id === Number(keys[0]))
  if (node) emit('edit', node)
}

const { allowTreeDrop, onTreeDragStart, onTreeDragEnd, onTreeDrop } = useChannelTreeSort(
  toRef(props, 'flat'),
  async () => emit('changed'),
  async () => emit('failed')
)

// 就地开关：不必进编辑面板，一处集中管理所有栏目的启用状态
const toggling = ref<number | null>(null)
const onToggleEnabled = async (node: Channel, enabled: boolean) => {
  toggling.value = node.id
  try {
    const res = await updateChannel({ id: node.id, hidden: !enabled })
    if (res.data.code === 200) {
      message.success(enabled ? `已启用「${node.name}」` : `已禁用「${node.name}」`)
      emit('changed')
    } else {
      message.error(res.data.message || '操作失败')
    }
  } catch {
    message.error('操作失败')
  } finally {
    toggling.value = null
  }
}
</script>

<style scoped>
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
  margin-bottom: 4px;
  font-weight: 600;
}

.pane-tip {
  margin: 0 0 12px;
  font-size: 12px;
  color: #8c8c8c;
}

.node-hidden {
  color: #bfbfbf;
}

.node-hidden-tag {
  margin-left: 8px;
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

/* 就地启用开关与操作图标：仅鼠标移入时显示 */
.node-switch {
  display: none;
  margin-right: 10px;
}

.node-row:hover .node-switch {
  display: inline-block;
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
