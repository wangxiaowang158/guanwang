// 栏目数据 composable —— 全局加载一次，驱动侧边栏菜单与页面路由解析
// 菜单可见性按当前管理员权限过滤：权限项取值为顶级栏目名，与后端 PermGuard 同源
import { computed, h, ref } from 'vue'
import * as Icons from '@ant-design/icons-vue'
import { getChannelList, type Channel } from '@/api/cms'
import { BOTTOM_MENUS, TOP_MENUS } from '@/constants/menu'
import { useUserStore } from '@/store'

// 全局共享状态（模块级，单例）
const channels = ref<Channel[]>([])
const loaded = ref(false)

/**
 * 不参与权限分配的系统级栏目类型（SRS 3.4 脚注）
 * siteconfig 后端仅要求登录，admins 后端要求超管，前端按同一口径放行
 */
const LOGIN_ONLY_TYPES: readonly string[] = ['siteconfig']
const SUPER_ONLY_TYPES: readonly string[] = ['admins']

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
  const { isSuper, hasPerm } = useUserStore()

  /** 某顶级栏目对当前管理员是否可见 */
  const isRootVisible = (root: Channel): boolean => {
    if (LOGIN_ONLY_TYPES.includes(root.type)) return true
    if (SUPER_ONLY_TYPES.includes(root.type)) return isSuper.value
    return hasPerm(root.name)
  }

  /** 上溯到顶级祖先的 id；断链或成环时返回 null */
  const rootIdOf = (ch: Channel): number | null => {
    let cur: Channel | undefined = ch
    // 防御环形 parentId：最多上溯节点总数次
    for (let i = 0; i < channels.value.length && cur && cur.parentId !== null; i += 1) {
      cur = channels.value.find(c => c.id === cur!.parentId)
    }
    return cur && cur.parentId === null ? cur.id : null
  }

  /**
   * 按权限过滤后的栏目集合
   * 子栏目随其顶级祖先一同可见，避免父级隐藏而子级漏出
   */
  const visibleChannels = computed(() => {
    const visibleRootIds = new Set(
      channels.value.filter(c => c.parentId === null && isRootVisible(c)).map(c => c.id)
    )
    return channels.value.filter(c => {
      const rootId = rootIdOf(c)
      return rootId !== null && visibleRootIds.has(rootId)
    })
  })

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

  /** 构建侧边栏菜单 items（已按权限过滤） */
  const buildMenu = () => toMenuItems(visibleChannels.value, null)

  /** 按 key 查栏目（不过滤权限，页面自身需要读取栏目配置） */
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

  /**
   * 当前管理员可访问的路径清单，顺序与侧边栏一致
   * 固定项按菜单名判权，栏目项取可见栏目中的叶子节点
   */
  const accessiblePaths = computed<string[]>(() => {
    const channelLeaves = [...visibleChannels.value]
      .sort((a, b) => a.sort - b.sort)
      .filter(c => c.type !== 'group')
      .map(channelPath)
    return [
      ...TOP_MENUS.filter(m => hasPerm(m.name)).map(m => m.path),
      ...channelLeaves,
      ...BOTTOM_MENUS.filter(m => hasPerm(m.name)).map(m => m.path)
    ]
  })

  /** 登录后的落地路径；一个菜单都没有权限时返回空串，由调用方处理 */
  const landingPath = (): string => accessiblePaths.value[0] ?? ''

  /** 某栏目页对当前管理员是否可访问 */
  const canVisitChannel = (key: string): boolean =>
    visibleChannels.value.some(c => c.key === key)

  return {
    channels,
    visibleChannels,
    loaded,
    load,
    buildMenu,
    findByKey,
    ancestors,
    accessiblePaths,
    landingPath,
    canVisitChannel
  }
}
