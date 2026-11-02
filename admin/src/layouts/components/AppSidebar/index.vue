<template>
  <a-layout-sider
    v-model:collapsed="collapsed"
    :width="200"
    class="app-sidebar"
    :trigger="null"
  >
    <!-- 菜单项多于一屏时在此容器内滚动，保证最底部的菜单可达 -->
    <div class="menu-scroll">
      <a-menu
        v-model:selectedKeys="selectedKeys"
        v-model:openKeys="openKeys"
        theme="dark"
        mode="inline"
        :items="menuItems"
        @click="handleMenuClick"
      />
    </div>
  </a-layout-sider>
</template>

<script setup lang="ts">
// 侧边栏：菜单由栏目配置动态生成
import { computed, ref, watch, onMounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  SettingOutlined,
  DashboardOutlined,
  BarChartOutlined,
  PictureOutlined,
  ToolOutlined
} from '@ant-design/icons-vue'
import { Badge } from 'ant-design-vue'
import type { ItemType } from 'ant-design-vue'
import { useChannels, channelPath } from '@/composables/useChannels'
import { usePendingFeedback } from '@/composables/usePendingFeedback'
import { TOP_MENUS, BOTTOM_MENUS, FIXED_MENU_PATHS } from '@/constants/menu'
import { useUserStore } from '@/store'

defineOptions({ name: 'AppSidebar' })

const route = useRoute()
const router = useRouter()
const { load, buildMenu, findByKey, ancestors, visibleChannels } = useChannels()
const { hasPerm } = useUserStore()

const collapsed = defineModel<boolean>('collapsed', { default: false })
const selectedKeys = ref<string[]>([])
const openKeys = ref<string[]>([])

// 固定菜单项的图标，按路径取用
const FIXED_ICONS: Record<string, () => ReturnType<typeof h>> = {
  '/dashboard': () => h(DashboardOutlined),
  '/visit-stats': () => h(BarChartOutlined),
  '/media': () => h(PictureOutlined),
  '/site-tools': () => h(ToolOutlined),
  '/channel-manage': () => h(SettingOutlined)
}

// 由共享常量补充图标，生成 a-menu 所需的菜单项；无权限的固定项不渲染（非禁用）
const toMenuItems = (metas: readonly { path: string; name: string }[]) =>
  metas
    .filter(m => hasPerm(m.name))
    .map(m => ({ key: m.path, label: m.name, title: m.name, icon: FIXED_ICONS[m.path] }))

// 留言栏目的菜单 key：按栏目类型找，栏目改名、改 key 都不影响
const feedbackMenuKey = computed(() => {
  const ch = visibleChannels.value.find(c => c.type === 'feedback')
  return ch ? channelPath(ch) : ''
})
const { pending, refresh: refreshPending } = usePendingFeedback()

/** 给留言菜单项挂上待处理角标（递归找，留言可能挂在分组下） */
const withBadge = (items: ItemType[]): ItemType[] =>
  items.map((it) => {
    if (!it || typeof it !== 'object') return it
    const node = it as ItemType & { key?: string; label?: unknown; children?: ItemType[] }
    if (node.children) return { ...node, children: withBadge(node.children) } as ItemType
    if (node.key !== feedbackMenuKey.value || !pending.value) return it
    return {
      ...node,
      label: h('span', { class: 'menu-badge-label' }, [
        String(node.label),
        h(Badge, { count: pending.value, overflowCount: 99, size: 'small', title: `${pending.value} 条待处理` }),
      ]),
    } as ItemType
  })

// 菜单项随栏目数据与权限响应式重算：栏目管理里增删改后 load(true) 即刷新此处
const menuItems = computed(() => withBadge([
  ...toMenuItems(TOP_MENUS),
  ...buildMenu(),
  ...toMenuItems(BOTTOM_MENUS)
]))

// 有留言菜单（即有权限）才取数；路由切换时顺带刷新（内部节流 30 秒）
const syncPending = () => { if (feedbackMenuKey.value) void refreshPending() }

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
  syncActive()
  syncPending()
})

watch(() => route.fullPath, () => {
  syncActive()
  syncPending()
})

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
/* 底色与菜单配色统一由 useTheme 的 Menu token 控制，这里只管容器 */
.app-sidebar {
  background: #152036;
  box-shadow: 2px 0 12px rgba(15, 23, 42, 0.08);
}

.menu-scroll {
  height: 100%;
  padding: 10px 0 16px;
  overflow-y: auto;
  overflow-x: hidden;
  /* 细滚动条，避免常驻宽滚动条破坏深色侧栏观感 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}

/* 深色菜单配色：一级与侧栏同底，子菜单略深，文字略提亮 */
:deep(.ant-menu.ant-menu-dark),
:deep(.ant-menu-dark .ant-menu-sub.ant-menu-inline) {
  background: transparent;
}

:deep(.ant-menu-dark .ant-menu-sub.ant-menu-inline) {
  margin: 2px 0;
  background: rgba(0, 0, 0, 0.18);
}

:deep(.ant-menu-dark .ant-menu-item),
:deep(.ant-menu-dark .ant-menu-submenu-title) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.ant-menu-dark .ant-menu-item:not(.ant-menu-item-selected):hover),
:deep(.ant-menu-dark .ant-menu-submenu-title:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

/* 选中项加一层主色投影，浮出深色底 */
:deep(.ant-menu-dark .ant-menu-item-selected) {
  box-shadow: 0 4px 12px rgba(47, 124, 255, 0.35);
}

/* 展开的父级菜单文字提亮，标出当前所在分组 */
:deep(.ant-menu-dark .ant-menu-submenu-selected > .ant-menu-submenu-title) {
  color: #fff;
}

/* 菜单文字与角标同行，角标靠右 */
:deep(.menu-badge-label) {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}
</style>
