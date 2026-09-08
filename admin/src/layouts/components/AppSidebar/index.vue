<template>
  <a-layout-sider
    v-model:collapsed="collapsed"
    :width="200"
    class="app-sidebar"
    :trigger="null"
  >
    <a-menu
      v-model:selectedKeys="selectedKeys"
      v-model:openKeys="openKeys"
      theme="dark"
      mode="inline"
      :items="menuItems"
      @click="handleMenuClick"
    />
  </a-layout-sider>
</template>

<script setup lang="ts">
// 侧边栏：菜单由栏目配置动态生成
import { ref, watch, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SettingOutlined, DashboardOutlined, BarChartOutlined } from '@ant-design/icons-vue'
import { useChannels, channelPath } from '@/composables/useChannels'
import { TOP_MENUS, BOTTOM_MENUS, FIXED_MENU_PATHS } from '@/constants/menu'

const route = useRoute()
const router = useRouter()
const { load, buildMenu, findByKey, ancestors } = useChannels()

const collapsed = defineModel<boolean>('collapsed', { default: false })
const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>([])
const menuItems = ref<any[]>([])

// 固定菜单项的图标，按路径取用
const FIXED_ICONS: Record<string, () => ReturnType<typeof h>> = {
  '/dashboard': () => h(DashboardOutlined),
  '/visit-stats': () => h(BarChartOutlined),
  '/channel-manage': () => h(SettingOutlined)
}

// 由共享常量补充图标，生成 a-menu 所需的菜单项
const toMenuItems = (metas: readonly { path: string; name: string }[]) =>
  metas.map(m => ({ key: m.path, label: m.name, title: m.name, icon: FIXED_ICONS[m.path] }))

// 顶部固定项：仪表盘 / 访问统计；底部固定项：栏目管理（均为独立路由，不走栏目配置）
const TOP_ITEMS = toMenuItems(TOP_MENUS)
const FIXED_ITEMS = toMenuItems(BOTTOM_MENUS)

// 根据当前路由同步高亮项与展开的父菜单
const syncActive = () => {
  if (FIXED_MENU_PATHS.includes(route.path)) {
    selectedKeys.value = [route.path]
    return
  }
  const key = route.params.channelKey as string
  if (!key) return
  selectedKeys.value = [channelPath({ key } as never)]
  const chain = ancestors(key)
  // 展开除自身外的所有祖先分组
  openKeys.value = chain.slice(0, -1).map(c => `group-${c.id}`)
}

onMounted(async () => {
  await load()
  menuItems.value = [...TOP_ITEMS, ...buildMenu(), ...FIXED_ITEMS]
  syncActive()
})

watch(() => route.fullPath, syncActive)

const handleMenuClick = ({ key }: { key: string }) => {
  if (FIXED_MENU_PATHS.includes(key)) {
    router.push(key)
    return
  }
  if (key.startsWith('/cms/')) {
    const chKey = key.replace('/cms/', '')
    const ch = findByKey(chKey)
    // 纯父级分组不跳转
    if (ch && ch.type !== 'group') router.push(key)
  }
}
</script>

<style scoped>
.app-sidebar {
  background: #1f2a44;
}

:deep(.ant-menu.ant-menu-dark) {
  background: #1f2a44;
}

:deep(.ant-menu-dark .ant-menu-sub) {
  background: #18233a;
}

:deep(.ant-layout-sider-trigger) {
  background: #1f2a44;
}
</style>
