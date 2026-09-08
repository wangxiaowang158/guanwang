// 非栏目类固定菜单项 —— 独立路由注册，不由栏目配置驱动
// 侧边栏据此渲染入口，管理员管理据此组装可授权的一级菜单项，避免两处各写一份而失同步

/** 固定菜单项元数据（图标由使用方按需补充，此处只描述路径与名称） */
export interface FixedMenuMeta {
  /** 路由路径，同时作为菜单项 key */
  path: string
  /** 菜单显示名称，也是权限项的取值 */
  name: string
}

/** 排在栏目菜单之前的固定项 */
export const TOP_MENUS: readonly FixedMenuMeta[] = [
  { path: '/dashboard', name: '数据仪表盘' },
  { path: '/visit-stats', name: '访问统计' }
]

/** 排在栏目菜单之后的固定项 */
export const BOTTOM_MENUS: readonly FixedMenuMeta[] = [
  { path: '/channel-manage', name: '栏目管理' }
]

/** 全部固定路由路径，用于判断当前路由是否为非栏目页 */
export const FIXED_MENU_PATHS: readonly string[] = [...TOP_MENUS, ...BOTTOM_MENUS].map(m => m.path)

/**
 * 不参与权限分配的栏目类型：
 * 基本信息与管理员管理属系统级模块，按需求固定排除在授权范围之外
 */
export const NON_GRANTABLE_CHANNEL_TYPES: readonly string[] = ['siteconfig', 'admins']
