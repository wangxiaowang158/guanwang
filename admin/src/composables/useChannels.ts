// 栏目数据 composable —— 全局加载一次，驱动侧边栏菜单与页面路由解析
// 菜单可见性按当前管理员权限过滤：权限项取值为顶级栏目名，与后端 PermGuard 同源
import { computed, h, ref } from 'vue'
import * as Icons from '@ant-design/icons-vue'
import type { ItemType } from 'ant-design-vue'
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
// oplog 含全部管理员的操作行踪，后端同样要求超管
const SUPER_ONLY_TYPES: readonly string[] = ['admins', 'oplog']

/** 渲染图标：按名称从 antd icons 取，取不到用默认 */
function renderIcon(name?: string) {
  const Comp = name && (Icons as Record<string, unknown>)[name]
  return Comp ? () => h(Comp as never) : undefined
}

/** 叶子节点（可点击页面）对应的路由路径 */
export function channelPath(ch: Channel) {
  return `/cms/${ch.key}`
}

/** 一级栏目挂靠的目标（官网导航里它出现在谁的下拉中）；目标不存在或不是一级栏目时视为未挂靠 */
function dockTargetOf(list: Channel[], c: Channel): Channel | undefined {
  if (c.parentId !== null || !c.menuParent) return undefined
  return list.find(t => t.key === c.menuParent && t.parentId === null && t.key !== c.key)
}

/**
 * 扁平数组 → antd 菜单 items（递归）
 * 侧边栏与官网导航同构：挂靠页（如各子智能体页）归到所挂一级栏目下，排在其自身子栏目之后，
 * 不然二十多个页面平铺成一级菜单无从查找。没有任何可点子项的分组（如纯外链栏目）不渲染
 */
function toMenuItems(list: Channel[], parentId: number | null, parent?: Channel): ItemType[] {
  const own = list.filter(c => c.parentId === parentId && (parentId !== null || !dockTargetOf(list, c)))
  const docked = parent ? list.filter(c => dockTargetOf(list, c)?.id === parent.id) : []
  const items: ItemType[] = []
  for (const c of [...own.sort((a, b) => a.sort - b.sort), ...docked.sort((a, b) => a.sort - b.sort)]) {
    const children = toMenuItems(list, c.id, c)
    // 叶子页面被别的页面挂靠后成了分组，自身的内容入口补在子项首位，否则只能展开不能点进去管理
    if (c.type !== 'group' && children.length && !list.some(x => x.parentId === c.id)) {
      children.unshift({ key: channelPath(c), label: c.name, title: c.name })
    }
    const isGroup = c.type === 'group' || children.length > 0
    if (isGroup && !children.length) continue
    items.push({
      key: isGroup ? `group-${c.id}` : channelPath(c),
      label: c.name,
      title: c.name,
      icon: renderIcon(c.icon),
      children: isGroup ? children : undefined
    })
  }
  return items
}

export function useChannels() {
  const { isSuper, hasPerm } = useUserStore()

  /**
   * 某顶级栏目对当前管理员是否可见
   * 挂靠页随所挂栏目授权（与后端 resolvePermNames 同口径）：有所挂栏目或页面自身的权限即可见
   */
  const isRootVisible = (root: Channel): boolean => {
    if (LOGIN_ONLY_TYPES.includes(root.type)) return true
    if (SUPER_ONLY_TYPES.includes(root.type)) return isSuper.value
    const dock = dockTargetOf(channels.value, root)
    return hasPerm(root.name) || (!!dock && hasPerm(dock.name))
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
    // 已隐藏的一级模块不进侧边栏，也不可经路由访问；栏目管理页读原始列表，仍可恢复
    const visibleRootIds = new Set(
      channels.value.filter(c => c.parentId === null && !c.hidden && isRootVisible(c)).map(c => c.id)
    )
    // 二级栏目也可单独隐藏；祖先链上任一节点被隐藏，其下整棵子树都不可见
    const byId = new Map(channels.value.map(c => [c.id, c]))
    const hiddenInChain = (c: Channel): boolean => {
      let cur: Channel | undefined = c
      while (cur) {
        if (cur.hidden) return true
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return false
    }
    return channels.value.filter(c => {
      const rootId = rootIdOf(c)
      return rootId !== null && visibleRootIds.has(rootId) && !hiddenInChain(c)
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
    // 挂靠页在侧边栏里位于所挂栏目之下：链首补上该栏目，面包屑与菜单展开才对得上
    // 与侧边栏同口径取可见栏目：挂靠目标被隐藏或无权限时，侧边栏把挂靠页放在一级，这里也不补
    const dock = chain[0] ? dockTargetOf(visibleChannels.value, chain[0]) : undefined
    if (dock) chain.unshift(dock)
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
