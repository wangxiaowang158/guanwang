<template>
  <!-- 角色管理：可复用的菜单权限组；账号最终权限 = 所属角色权限 ∪ 账号单独勾选的权限 -->
  <a-drawer :open="open" title="角色管理" width="760" @close="emit('update:open', false)">
    <a-alert
      type="info"
      show-icon
      class="tip"
      message="给账号指定角色后，其权限为「角色权限 + 账号单独勾选的权限」。修改角色立即对所有使用该角色的账号生效。"
    />
    <div class="ops">
      <a-button type="primary" @click="openEdit()">
        <template #icon><PlusOutlined /></template>
        新增角色
      </a-button>
    </div>
    <a-table :columns="COLUMNS" :data-source="roles" :loading="loading" :pagination="false" row-key="id" size="middle">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'perms'">
          <a-tag v-for="p in record.perms.slice(0, 4)" :key="p" color="blue">{{ p }}</a-tag>
          <span v-if="record.perms.length > 4">等 {{ record.perms.length }} 项</span>
          <span v-if="!record.perms.length">-</span>
        </template>
        <template v-else-if="column.key === 'ops'">
          <a-space :size="4">
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <!-- 有账号在用时后端拒绝删除，这里直接置灰并说明 -->
            <a-tooltip :title="record.adminCount ? '仍有账号使用该角色，请先为它们更换角色' : ''">
              <a-popconfirm
                title="确定删除该角色吗？"
                ok-type="danger"
                ok-text="删除"
                cancel-text="取消"
                :disabled="!!record.adminCount"
                @confirm="onDelete(record.id)"
              >
                <a-button type="link" size="small" danger :disabled="!!record.adminCount">删除</a-button>
              </a-popconfirm>
            </a-tooltip>
          </a-space>
        </template>
      </template>
      <template #emptyText>
        <a-empty description="还没有角色，可按岗位新建，如「内容编辑」「市场运营」" />
      </template>
    </a-table>

    <a-modal
      v-model:open="editVisible"
      :title="form.id ? '编辑角色' : '新增角色'"
      width="680px"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      @ok="onSave"
    >
      <a-form :label-col="{ style: { width: '80px' } }" style="margin-top: 8px">
        <a-form-item label="角色名" required>
          <a-input v-model:value="form.name" :maxlength="50" placeholder="如：内容编辑" />
        </a-form-item>
        <a-form-item label="权限">
          <a-checkbox-group v-model:value="form.perms" :options="permOptions" />
        </a-form-item>
        <a-form-item label="说明">
          <a-input v-model:value="form.remark" :maxlength="200" placeholder="选填，如：负责新闻与案例的日常更新" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-drawer>
</template>

<script setup lang="ts">
// 角色 CRUD 抽屉；权限项由父级传入，与账号表单的勾选项同一份
import { reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { deleteRole, getRoles, saveRole, type AdminRole } from '@/api/admin'
import { DELETE_FAILED, DELETE_SUCCESS, SAVE_FAILED, SAVE_SUCCESS } from '@/constants/ui'

const props = defineProps<{ open: boolean; permOptions: { label: string; value: string }[] }>()
/** changed：角色有增删改，父级据此刷新角色下拉与列表 */
const emit = defineEmits<{ 'update:open': [boolean]; changed: [AdminRole[]] }>()

const COLUMNS = [
  { title: '角色名', dataIndex: 'name', key: 'name', width: 140 },
  { title: '权限', key: 'perms' },
  { title: '账号数', dataIndex: 'adminCount', key: 'adminCount', width: 80, align: 'center' as const },
  { title: '操作', key: 'ops', width: 130, align: 'center' as const },
]

const loading = ref(false)
const roles = ref<AdminRole[]>([])

const fetchRoles = async () => {
  loading.value = true
  try {
    const res = await getRoles()
    if (res.data.code !== 200) {
      message.error(res.data.message || '角色加载失败')
      return
    }
    roles.value = res.data.data ?? []
    emit('changed', roles.value)
  } catch {
    message.error('角色加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const editVisible = ref(false)
const saving = ref(false)
const form = reactive({ id: undefined as number | undefined, name: '', perms: [] as string[], remark: '' })

const openEdit = (record?: AdminRole) => {
  // 编辑时只保留当前仍可授权的项：已删栏目的残留权限保存时随之清掉
  const allowed = new Set(props.permOptions.map(o => o.value))
  Object.assign(form, record
    ? { id: record.id, name: record.name, perms: record.perms.filter(p => allowed.has(p)), remark: record.remark }
    : { id: undefined, name: '', perms: [], remark: '' })
  editVisible.value = true
}

const onSave = async () => {
  const name = form.name.trim()
  if (!name) {
    message.warning('请填写角色名')
    return
  }
  saving.value = true
  try {
    const res = await saveRole({ id: form.id, name, perms: form.perms, remark: form.remark.trim() })
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    message.success(SAVE_SUCCESS)
    editVisible.value = false
    fetchRoles()
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    saving.value = false
  }
}

const onDelete = async (id: number) => {
  try {
    const res = await deleteRole(id)
    if (res.data.code !== 200) {
      message.error(res.data.message || DELETE_FAILED)
      return
    }
    message.success(DELETE_SUCCESS)
    fetchRoles()
  } catch {
    message.error(DELETE_FAILED)
  }
}

watch(() => props.open, (opened) => { if (opened) fetchRoles() })
</script>

<style scoped>
.tip { margin-bottom: 12px; }
.ops { margin-bottom: 12px; }
</style>
