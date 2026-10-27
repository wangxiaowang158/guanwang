<template>
  <div class="admin-list">
    <div class="page-title">管理员列表</div>

    <div class="toolbar">
      <a-input
        v-model:value="keyword"
        placeholder="输入账号/姓名"
        style="width: 240px"
        allow-clear
        @press-enter="search"
      />
      <SearchActions :loading="loading" @search="search" @reset="onResetFilters" />
    </div>
    <div class="actions">
      <span class="actions-title">管理员账号</span>
      <a-space>
        <a-button @click="roleOpen = true">角色管理</a-button>
        <a-button type="primary" @click="openEdit()">
          <template #icon><PlusOutlined /></template>
          新增管理员
        </a-button>
      </a-space>
    </div>
    <RoleManager
      v-model:open="roleOpen"
      :perm-options="permOptions"
      @changed="(list) => { roles = list; fetchList() }"
    />

    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="middle"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <span v-if="record.isSuper">-</span>
          <a-tag v-else-if="roleName(record.roleId)" color="purple">{{ roleName(record.roleId) }}</a-tag>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'perms'">
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
        <a-form-item v-if="!form.isSuper" label="角色">
          <a-select
            v-model:value="form.roleId"
            :options="roleOptions"
            placeholder="不套角色"
            allow-clear
            style="width: 240px"
          />
          <div class="field-tip">最终权限 = 角色权限 + 下方单独勾选的权限；修改角色立即对使用它的账号生效</div>
          <div v-if="selectedRolePerms.length" class="field-tip">
            该角色已含：{{ selectedRolePerms.join('、') }}
          </div>
        </a-form-item>
        <a-form-item :label="form.isSuper ? '权限设置' : '单独授权'">
          <!-- 超管拥有全部权限且不可调整，后端亦不保存其权限清单 -->
          <div v-if="form.isSuper" class="super-hint">超级管理员拥有全部功能模块权限，无需分配</div>
          <template v-else>
            <a-checkbox-group v-model:value="form.perms" :options="permOptions" />
            <!-- 历史上单独授予的挂靠页权限（或已删栏目的残留）：不再单列为勾选项，默认保存时保留，
                 避免改别的权限时被静默丢掉；点叉号即撤销 -->
            <div v-if="legacyPerms.length" class="legacy-hint">
              <span>另有单独授予的页面权限，保存时保留，点 × 撤销：</span>
              <a-tag v-for="p in legacyPerms" :key="p" closable @close.prevent="removeLegacy(p)">{{ p }}</a-tag>
            </div>
          </template>
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
import SearchActions from '@/components/SearchActions/index.vue'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { PlusOutlined } from '@ant-design/icons-vue'
import {
  getAdminList, addAdmin, updateAdmin, resetAdminPassword, deleteAdmin, getRoles,
  type AdminItem, type AdminRole
} from '@/api/admin'
import RoleManager from './components/RoleManager.vue'
import { useChannels } from '@/composables/useChannels'
import { useServerListPage } from '@/composables/useServerListPage'
import { TOP_MENUS, BOTTOM_MENUS, NON_GRANTABLE_CHANNEL_TYPES } from '@/constants/menu'
import { DELETE_FAILED, DELETE_SUCCESS, SAVE_FAILED, SAVE_SUCCESS } from '@/constants/ui'

const { load, channels } = useChannels()

const columns = [
  { title: '账号', dataIndex: 'account', key: 'account', width: 160 },
  { title: '姓名', dataIndex: 'name', key: 'name', width: 140 },
  { title: '角色', key: 'role', width: 130 },
  { title: '单独授权', key: 'perms' },
  { title: '微信绑定', key: 'wechatBound', width: 110, align: 'center' as const },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 140 }
]

const keyword = ref('')

const {
  loading, rows, page, pageSize, total,
  fetchList, search, onPageChange, refreshAfterRemove,
} = useServerListPage<AdminItem>((query) =>
  getAdminList({
    keyword: keyword.value || undefined,
    page: query.page,
    pageSize: query.pageSize,
  }),
)

// 重置：清空全部筛选条件后回到首页重查
const onResetFilters = () => {
  keyword.value = ''
  search()
}

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条`,
}))

/** 表格分页变更 */
const onTableChange = (pag: { current?: number; pageSize?: number }) =>
  onPageChange(pag.current || 1, pag.pageSize || pageSize.value)

// 权限项：与侧边栏一级菜单同序 —— 固定顶部项 + 栏目顶层项 + 固定底部项
// 基本信息与管理员管理属系统级模块，固定排除在授权范围外
const permOptions = computed(() => {
  // 挂靠页随所挂栏目授权（勾「智慧能源解决方案」即含其下全部子页），不单列为权限项
  const keys = new Set(channels.value.filter(c => c.parentId === null).map(c => c.key))
  const channelPerms = channels.value
    .filter(c => c.parentId === null && !NON_GRANTABLE_CHANNEL_TYPES.includes(c.type))
    .filter(c => !c.menuParent || !keys.has(c.menuParent))
    .sort((a, b) => a.sort - b.sort)
    .map(c => c.name)
  return [...TOP_MENUS.map(m => m.name), ...channelPerms, ...BOTTOM_MENUS.map(m => m.name)]
    .map(name => ({ label: name, value: name }))
})

/**
 * 不在当前勾选项里的历史权限（如早先单独授予的挂靠页），打开编辑时从勾选值里拆出来单独保管
 * 不改映射成所挂栏目：那样会把一个子页的权限放大成整个导航下全部页面
 */
const legacyPerms = ref<string[]>([])
const removeLegacy = (name: string) => {
  legacyPerms.value = legacyPerms.value.filter(p => p !== name)
}

// 角色：列表列显示角色名、表单下拉选择；角色管理抽屉增删改后经 changed 回写
const roleOpen = ref(false)
const roles = ref<AdminRole[]>([])
const roleOptions = computed(() => roles.value.map(r => ({ label: r.name, value: r.id })))
const roleName = (id: number | null) => (id ? roles.value.find(r => r.id === id)?.name ?? '' : '')
const loadRoles = async () => {
  try {
    const res = await getRoles()
    if (res.data.code === 200) roles.value = res.data.data ?? []
  } catch {
    // 角色取不到不阻断账号管理：下拉为空即按「不套角色」处理
  }
}

const formRef = ref()
const editVisible = ref(false)
const saving = ref(false)

const defaultForm = () => ({
  id: undefined as number | undefined,
  account: '', name: '', password: '', confirmPassword: '',
  perms: [] as string[], wechatBound: false,
  roleId: undefined as number | undefined,
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

const openEdit = (record?: AdminItem) => {
  Object.assign(form, defaultForm())
  legacyPerms.value = []
  formRef.value?.resetFields()
  if (record) {
    form.id = record.id
    form.account = record.account
    form.name = record.name
    const optionNames = new Set(permOptions.value.map(o => o.value))
    form.perms = record.perms.filter(p => optionNames.has(p))
    legacyPerms.value = record.perms.filter(p => !optionNames.has(p))
    form.wechatBound = record.wechatBound
    form.isSuper = record.isSuper
    form.roleId = record.roleId ?? undefined
  }
  editVisible.value = true
}

/** 所选角色带来的权限，表单里提示，免得运营在下方重复勾选 */
const selectedRolePerms = computed(() => roles.value.find(r => r.id === form.roleId)?.perms ?? [])

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
          perms: [...form.perms, ...legacyPerms.value],
          // 清空下拉得 undefined，须显式发 null 才会取消角色（undefined 后端视为不改）
          roleId: form.roleId ?? null,
          wechatBound: form.wechatBound
        })
      : await addAdmin({
          account: form.account,
          name: form.name,
          password: form.password,
          perms: form.perms,
          roleId: form.roleId ?? null,
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
    // 新增回到第一页：列表按创建时间倒序，新账号只会落在首页，
    // 停在原页会让用户以为没保存成功
    if (editingId) {
      fetchList()
    } else {
      search()
    }
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
    // 删空当前页时自动回退一页，避免停在空白页
    refreshAfterRemove(1)
  } catch {
    message.error(DELETE_FAILED)
  }
}

// 列表由 useServerListPage 在挂载时自行加载，这里只取栏目数据供权限勾选用、角色供下拉与列表列用
onMounted(() => {
  void load()
  void loadRoles()
})
</script>

<style scoped>
.legacy-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 0;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
}

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

/* 查询条件独立成浅灰区块；下方 .actions 为功能操作行，靠右，与查询区分开 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.actions-title {
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.super-hint {
  color: #8c8c8c;
  font-size: 13px;
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
