<template>
  <!-- 跳转规则：改版或改链接后，旧地址 301 到新地址，保住搜索引擎收录与外部引用 -->
  <div>
    <a-alert type="info" show-icon class="tip">
      <template #message>
        <div>· 301 永久跳转：页面改版、改链接后使用，搜索引擎会把旧地址的收录权重转到新地址。</div>
        <div>· 302 临时跳转：活动页临时导流使用，搜索引擎仍保留旧地址。</div>
        <div>· 旧地址按不区分大小写、忽略结尾斜杠与 ? 后参数匹配；新地址为站内路径时会带上访客原来的参数。</div>
        <div>· 规则由正式环境的网关执行，本地开发（npm run dev）下不生效。</div>
      </template>
    </a-alert>

    <div class="toolbar">
      <a-input
        v-model:value="keyword"
        placeholder="搜索旧地址 / 新地址 / 备注"
        style="width: 280px"
        allow-clear
        :maxlength="100"
        @press-enter="search"
      />
      <SearchActions :loading="loading" @search="search" @reset="onReset" />
    </div>
    <div class="actions">
      <span class="actions-title">跳转规则</span>
      <a-space>
        <a-button type="primary" @click="openEdit()">
          <template #icon><PlusOutlined /></template>
          新增规则
        </a-button>
        <a-popconfirm
          :title="`确定删除选中的 ${selectedKeys.length} 条规则吗？`"
          ok-type="danger"
          ok-text="删除"
          cancel-text="取消"
          :disabled="!selectedKeys.length"
          @confirm="onDelete(selectedKeys)"
        >
          <a-button :disabled="!selectedKeys.length">批量删除</a-button>
        </a-popconfirm>
      </a-space>
    </div>

    <a-table
      :columns="COLUMNS"
      :data-source="rows"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      size="middle"
      :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'fromPath'"><code>{{ record.fromPath }}</code></template>
        <template v-else-if="column.key === 'toUrl'"><span class="url">{{ record.toUrl }}</span></template>
        <template v-else-if="column.key === 'statusCode'">
          <a-tag :color="record.statusCode === 301 ? 'blue' : 'orange'">{{ record.statusCode }}</a-tag>
        </template>
        <template v-else-if="column.key === 'enabled'">
          <a-tag :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '启用' : '停用' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'hits'">
          {{ record.hits }}
          <div v-if="record.lastHitAt" class="sub">最近 {{ record.lastHitAt }}</div>
        </template>
        <template v-else-if="column.key === 'ops'">
          <a-space :size="4">
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm title="确定删除这条规则吗？" ok-type="danger" ok-text="删除" cancel-text="取消" @confirm="onDelete([record.id])">
              <a-button type="link" size="small" danger>删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="editVisible"
      :title="form.id ? '编辑跳转规则' : '新增跳转规则'"
      width="620px"
      :confirm-loading="saving"
      ok-text="保存"
      cancel-text="取消"
      @ok="onSave"
    >
      <a-form ref="formRef" :model="form" :rules="RULES" :label-col="{ style: { width: '90px' } }" style="margin-top: 8px">
        <a-form-item label="旧地址" name="fromPath" extra="站内路径，以 / 开头，如 /news.html、/old/about">
          <a-input v-model:value="form.fromPath" :maxlength="300" placeholder="/old-page" />
        </a-form-item>
        <a-form-item label="新地址" name="toUrl" extra="站内路径（/ 开头）或完整网址（https://…）；请直接填最终地址，不要再指向另一条规则的旧地址">
          <a-input v-model:value="form.toUrl" :maxlength="500" placeholder="/news" />
        </a-form-item>
        <a-form-item label="跳转类型" name="statusCode">
          <a-radio-group v-model:value="form.statusCode">
            <a-radio :value="301">301 永久</a-radio>
            <a-radio :value="302">302 临时</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="form.enabled" />
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-input v-model:value="form.remark" :maxlength="100" placeholder="为什么加这条，日后清理时有据可查" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
// 跳转规则维护：列表 / 新增编辑 / 批量删除；路径规整与防环由后端兜底，这里只做形态预校验
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { PlusOutlined } from '@ant-design/icons-vue'
import SearchActions from '@/components/SearchActions/index.vue'
import { useServerListPage } from '@/composables/useServerListPage'
import { deleteRedirects, getRedirectList, saveRedirect, type RedirectRule } from '@/api/siteTools'
import { DELETE_FAILED, DELETE_SUCCESS, SAVE_FAILED, SAVE_SUCCESS } from '@/constants/ui'

const COLUMNS = [
  { title: '旧地址', key: 'fromPath' },
  { title: '新地址', key: 'toUrl' },
  { title: '类型', key: 'statusCode', width: 80, align: 'center' as const },
  { title: '状态', key: 'enabled', width: 80, align: 'center' as const },
  { title: '命中次数', key: 'hits', width: 170 },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 180, ellipsis: true },
  { title: '操作', key: 'ops', width: 130, align: 'center' as const },
]

const keyword = ref('')
const {
  loading, rows, page, pageSize, total, selectedKeys,
  fetchList, search, onPageChange, onSelectChange, refreshAfterRemove,
} = useServerListPage<RedirectRule>((q) =>
  getRedirectList({ keyword: keyword.value || undefined, page: q.page, pageSize: q.pageSize }),
)

const onReset = () => {
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

const onTableChange = (pag: { current?: number; pageSize?: number }) =>
  onPageChange(pag.current || 1, pag.pageSize || pageSize.value)

const formRef = ref()
const editVisible = ref(false)
const saving = ref(false)
const defaultForm = () => ({
  id: undefined as number | undefined,
  fromPath: '',
  toUrl: '',
  statusCode: 301 as 301 | 302,
  enabled: true,
  remark: '',
})
const form = reactive(defaultForm())

/** 与后端同口径的形态预校验；接口、上传目录等保留前缀与链式跳转由后端判定并给出原因 */
const RULES: Record<string, Rule[]> = {
  fromPath: [{
    validator: (_r, v: string) => {
      const s = (v || '').trim()
      if (!s) return Promise.reject('请填写旧地址')
      if (!/^\/(?!\/)/.test(s)) return Promise.reject('旧地址须以 / 开头的站内路径')
      if (s === '/') return Promise.reject('首页不能设置跳转')
      return Promise.resolve()
    },
    trigger: 'blur',
  }],
  toUrl: [{
    validator: (_r, v: string) => {
      const s = (v || '').trim()
      if (!s) return Promise.reject('请填写新地址')
      if (/[\s"'<>\\]/.test(s)) return Promise.reject('新地址不能包含空格、引号或尖括号')
      if (!/^\/(?!\/)/.test(s) && !/^https?:\/\/[^/]+/i.test(s)) {
        return Promise.reject('新地址须为 / 开头的站内路径，或 http(s):// 开头的完整网址')
      }
      return Promise.resolve()
    },
    trigger: 'blur',
  }],
}

const openEdit = (record?: RedirectRule) => {
  Object.assign(form, defaultForm())
  formRef.value?.clearValidate()
  if (record) {
    Object.assign(form, {
      id: record.id, fromPath: record.fromPath, toUrl: record.toUrl,
      statusCode: record.statusCode, enabled: record.enabled, remark: record.remark,
    })
  }
  editVisible.value = true
}

const onSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const res = await saveRedirect({
      id: form.id,
      fromPath: form.fromPath.trim(),
      toUrl: form.toUrl.trim(),
      statusCode: form.statusCode,
      enabled: form.enabled,
      remark: form.remark.trim(),
    })
    if (res.data.code !== 200) {
      message.error(res.data.message || SAVE_FAILED)
      return
    }
    message.success(SAVE_SUCCESS)
    editVisible.value = false
    if (form.id) fetchList()
    else search()
  } catch {
    message.error(SAVE_FAILED)
  } finally {
    saving.value = false
  }
}

const onDelete = async (ids: number[]) => {
  if (!ids.length) return
  try {
    const res = await deleteRedirects(ids)
    if (res.data.code !== 200) {
      message.error(res.data.message || DELETE_FAILED)
      return
    }
    message.success(DELETE_SUCCESS)
    refreshAfterRemove(ids.length)
  } catch {
    message.error(DELETE_FAILED)
  }
}
</script>

<style scoped>
.tip { margin-bottom: 16px; }

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

.url { word-break: break-all; }
.sub { font-size: 12px; color: #8c8c8c; }
</style>
