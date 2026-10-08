<template>
  <div class="channel-title">
    <template v-if="!editing">
      <span class="title-text">{{ channel.name }}</span>
      <a-tooltip v-if="canEdit" title="修改标题">
        <EditOutlined class="title-edit" @click="startEdit" />
      </a-tooltip>
    </template>
    <a-space v-else :size="8">
      <a-input
        v-model:value="draft"
        class="title-input"
        :maxlength="64"
        placeholder="请输入标题"
        @press-enter="onSave"
      />
      <a-button type="primary" size="small" :loading="saving" @click="onSave">保存</a-button>
      <a-button size="small" @click="editing = false">取消</a-button>
    </a-space>
  </div>
</template>

<script setup lang="ts">
// 栏目标题：展示栏目名称，有「栏目管理」权限时可就地修改；改名后侧边栏、面包屑与官网区块标题同步变化
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { EditOutlined } from '@ant-design/icons-vue'
import { updateChannel, type Channel } from '@/api/cms'
import { useChannels } from '@/composables/useChannels'
import { useUserStore } from '@/store'

const props = defineProps<{ channel: Channel }>()

const { load } = useChannels()
const { hasPerm } = useUserStore()

const editing = ref(false)
const saving = ref(false)
const draft = ref('')

// 后端写接口要求「栏目管理」权限，无权限者不给入口
const canEdit = computed(() => hasPerm('栏目管理'))

const startEdit = () => {
  draft.value = props.channel.name
  editing.value = true
}

const onSave = async () => {
  const name = draft.value.trim()
  if (!name) {
    message.error('标题不能为空')
    return
  }
  if (name === props.channel.name) {
    editing.value = false
    return
  }
  saving.value = true
  try {
    const res = await updateChannel({ id: props.channel.id, name })
    if (res.data.code === 200) {
      message.success('标题已更新')
      editing.value = false
      await load(true) // 刷新栏目数据，页面标题随 channel 重新取值
    } else {
      message.error(res.data.message || '保存失败')
    }
  } catch {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.channel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  min-height: 32px;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.title-edit {
  color: #8c8c8c;
  cursor: pointer;
}

.title-edit:hover {
  color: #1677ff;
}

.title-input {
  width: 320px;
}
</style>
