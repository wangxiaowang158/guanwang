<template>
  <div class="admin-list">
    <div class="page-title">管理员列表</div>

    <div class="toolbar">
      <a-input-search
        v-model:value="keyword"
        placeholder="输入账号/姓名"
        style="width: 240px"
        allow-clear
        @search="fetchList"
      />
      <a-button type="primary" @click="openEdit()">
        <template #icon><PlusOutlined /></template>
        新增管理员
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="{ pageSize: 10 }"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'perms'">
          <!-- 超管权限由身份表达，perms 为空数组，不能显示成「无权限」 -->
          <a-tag v-if="record.isSuper" color="gold">全部权限</a-tag>
          <template v-else>
            <a-tag v-for="p in record.perms.slice(0, 4)" :key="p" color="blue">{{ p }}</a-tag>
            <span v-if="record.perms.length > 4">等 {{ record.perms.length }} 项</span>
            <span v-if="!record.perms.length">-</span>
          </template>
        </template>
        <template v-else-if="column.key === 'wechatBound'">
          <a-tag :color="record.wechatBound ? 'green' : 'default'">
            {{ record.wechatBound ? '已绑定' : '未绑定' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <!-- 超管不可删除，与后端约束一致；默认管理员即超管 -->
            <a-popconfirm
              v-if="!record.isSuper"
              title="确认删除该管理员？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="onDelete(record.id)"
            >
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑 -->
    <a-modal
      v-model:open="editVisible"
      :title="form.id ? '编辑管理员' : '新增管理员'"
      width="720px"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      @ok="onSave"
    >
      <a-form ref="formRef" :model="form" :rules="rules" :label-col="{ style: { width: '90px' } }" style="margin-top: 8px">
        <a-form-item label="账号" name="account">
          <!-- 账号创建后不可改：后端更新接口不接受该字段 -->
          <a-input
            v-model:value="form.account"
            :maxlength="50"
            :disabled="!!form.id"
            placeholder="请输入账号"
          />
        </a-form-item>
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="form.name" :maxlength="50" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="新密码" name="password">
          <a-input-password v-model:value="form.password" :maxlength="100" placeholder="不修改请留空" />
        </a-form-item>
        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="form.confirmPassword" :maxlength="100" placeholder="再次输入密码" />
        </a-form-item>
        <a-form-item label="权限设置">
          <!-- 超管拥有全部权限且不可调整，后端亦不保存其权限清单 -->
          <div v-if="form.isSuper" class="super-hint">超级管理员拥有全部功能模块权限，无需分配</div>
          <a-checkbox-group v-else v-model:value="form.perms" :options="permOptions" />
        </a-form-item>
        <a-form-item label="微信登录">
          <a-button :type="form.wechatBound ? 'default' : 'primary'" ghost @click="toggleWechat">
            {{ form.wechatBound ? '已绑定微信' : '绑定微信' }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
// 管理员管理：列表 + 新增/编辑（权限勾选一级菜单、微信绑定）
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  getAdminList, addAdmin, updateAdmin, resetAdminPassword, deleteAdmin, type AdminItem
} from '@/api/admin'
import { useChannels } from '@/composables/useChannels'
import { TOP_MENUS, BOTTOM_MENUS, NON_GRANTABLE_CHANNEL_TYPES } from '@/constants/menu'
import { DELETE_FAILED, DELETE_SUCCESS, LIST_LOAD_FAILED, SAVE_FAILED, SAVE_SUCCESS } from '@/constants/ui'

const { load, channels } = useChannels()

const columns = [
  { title: '账号', dataIndex: 'account', key: 'account', width: 160 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 140 },
  { title: '权限', key: 'perms' },
  { title: '微信绑定', key: 'wechatBound', width: 110, align: 'center' as const },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 140 }
]

const loading = ref(false)
const rows = ref<AdminItem[]>([])
const keyword = ref('')

// 权限项：与侧边栏一级菜单同序 —— 固定顶部项 + 栏目顶层项 + 固定底部项
// 基本信息与管理员管理属系统级模块，固定排除在授权范围外
const permOptions = computed(() => {
  const channelPerms = channels.value
    .filter(c => c.parentId === null && !NON_GRANTABLE_CHANNEL_TYPES.includes(c.type))
    .sort((a, b) => a.sort - b.sort)
    .map(c => c.name)
  return [...TOP_MENUS.map(m => m.name), ...channelPerms, ...BOTTOM_MENUS.map(m => m.name)]
    .map(name => ({ label: name, value: name }))
})

const formRef = ref()
const editVisible = ref(false)
const saving = ref(false)

const defaultForm = () => ({
  id: undefined as number | undefined,
  account: '', name: '', password: '', confirmPassword: '',
  perms: [] as string[], wechatBound: false,
  /** 编辑超管时置真，用于隐藏权限勾选 */
  isSuper: false
})
const form = reactive(defaultForm())

// 密码规则与后端 DTO 对齐：新增必填且不少于 8 位，编辑时留空表示不改密码
const rules: Record<string, Rule[]> = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{
    validator: (_r, value: string) => {
      if (!form.id && !value) return Promise.reject('请输入密码')
      if (value && value.length < 8) return Promise.reject('密码不得少于 8 位')
      return Promise.resolve()
    },
    trigger: 'blur'
  }],
  confirmPassword: [{
    validator: (_r, value: string) =>
      value === form.password ? Promise.resolve() : Promise.reject('两次输入的密码不一致'),
    trigger: 'blur'
  }]
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getAdminList({ keyword: keyword.value || undefined })
    if (res.data.code === 200) rows.value = res.data.data
  } catch {
    message.error(LIST_LOAD_FAILED)
  } finally {
    loading.value = false
  }
}

const openEdit = (record?: AdminItem) => {
  Object.assign(form, defaultForm())
  formRef.value?.resetFields()
  if (record) {
    form.id = record.id
    form.account = record.account
    form.name = record.name
    form.perms = [...record.perms]
    form.wechatBound = record.wechatBound
    form.isSuper = record.isSuper
  }
  editVisible.value = true
}

const toggleWechat = () => {
  form.wechatBound = !form.wechatBound
}

const onSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    // 资料与密码分属两个接口：新增一次提交，编辑时仅填了密码才额外调重置
    const editingId = form.id
    const res = editingId
      ? await updateAdmin({
          id: editingId,
          name: form.name,
          perms: form.perms,
          wechatBound: form.wechatBound
        })
      : await addAdmin({
          account: form.account,
          name: form.name,
          password: form.password,
          perms: form.perms,
          wechatBound: form.wechatBound
        })
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    if (editingId && form.password) {
      const pwdRes = await resetAdminPassword(editingId, form.password)
      if (pwdRes.data.code !== 200) {
        message.error(pwdRes.data.message || '资料已保存，但密码重置失败')
        fetchList()
        return
      }
    }
    message.success(SAVE_SUCCESS)
    editVisible.value = false
    fetchList()
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    saving.value = false
  }
}

const onDelete = async (id: number) => {
  try {
    const res = await deleteAdmin(id)
    if (res.data.code !== 200) {
      message.error(res.data.message || DELETE_FAILED)
      return
    }
    message.success(DELETE_SUCCESS)
    fetchList()
  } catch {
    message.error(DELETE_FAILED)
  }
}

onMounted(async () => {
  await load()
  fetchList()
})
</script>

<style scoped>
.admin-list {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.super-hint {
  color: #8c8c8c;
  font-size: 13px;
}
</style>
