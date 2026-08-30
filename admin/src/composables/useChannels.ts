// 栏目数据 composable —— 全局加载一次，驱动侧边栏菜单与页面路由解析
import { h, ref } from 'vue'
import * as Icons from '@ant-design/icons-vue'
import { getChannelList, type Channel } from '@/api/cms'

// 全局共享状态（模块级，单例）
const channels = ref<Channel[]>([])
const loaded = ref(false)

/** 渲染图标：按名称从 antd icons 取，取不到用默认 */
function renderIcon(name?: string) {
  const Comp = name && (Icons as Record<string, unknown>)[name]
  return Comp ? () => h(Comp as never) : undefined
}

/** 叶子节点（可点击页面）对应的路由路径 */
export function channelPath(ch: Channel) {
  return `/cms/${ch.key}`
}

/** 扁平数组 → antd 菜单 items（递归） */
function toMenuItems(list: Channel[], parentId: number | null): any[] {
  return list
    .filter(c => c.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map(c => {
      const children = toMenuItems(list, c.id)
      const isGroup = c.type === 'group' || children.length > 0
      return {
        key: isGroup ? `group-${c.id}` : channelPath(c),
        label: c.name,
        title: c.name,
        icon: renderIcon(c.icon),
        children: isGroup ? children : undefined
      }
    })
}

export function useChannels() {
  /** 加载栏目（已加载则跳过，force 强制刷新） */
  const load = async (force = false) => {
    if (loaded.value && !force) return
    try {
      const res = await getChannelList()
      if (res.data.code === 200) {
        channels.value = res.data.data
        loaded.value = true
      }
    } catch {
      // 静默失败，避免中断上层 onMounted；菜单将为空，由页面占位提示
    }
  }

  /** 构建侧边栏菜单 items */
  const buildMenu = () => toMenuItems(channels.value, null)

  /** 按 key 查栏目 */
  const findByKey = (key: string) => channels.value.find(c => c.key === key)

  /** 取某栏目的祖先链（用于面包屑/展开父菜单） */
  const ancestors = (key: string): Channel[] => {
    const chain: Channel[] = []
    let cur = findByKey(key)
    while (cur) {
      chain.unshift(cur)
      cur = cur.parentId ? channels.value.find(c => c.id === cur!.parentId) : undefined
    }
    return chain
  }

  /** 第一个可访问的叶子栏目路径（登录后默认跳转） */
  const firstLeafPath = () => {
    const leaf = [...channels.value]
      .sort((a, b) => a.sort - b.sort)
      .find(c => c.type !== 'group')
    return leaf ? channelPath(leaf) : '/cms/siteinfo'
  }

  return { channels, loaded, load, buildMenu, findByKey, ancestors, firstLeafPath }
}
