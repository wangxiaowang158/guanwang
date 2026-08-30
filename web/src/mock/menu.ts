// 前台导航菜单 Mock —— 对齐 admin 后台 channel.js 的对外一级栏目
// 仅含访客可见栏目，排除后台专用（基本信息/Banner/TDK/留言/管理员）
// children 用于顶部下拉菜单，path + anchor 定位到目标页对应板块

/** 导航菜单项 */
export interface MenuNode {
  key: string
  label: string
  path: string
  /** 同页锚点 id（一级栏目无锚点，子项指向页内板块） */
  anchor?: string
  children?: MenuNode[]
}

export const menuTree: MenuNode[] = [
  { key: 'home', label: '首页', path: '/' },
  {
    key: 'hvac', label: '暖通空调产品', path: '/hvac',
    children: [
      { key: 'hvac-category', label: '产品类别', path: '/hvac', anchor: 'category' },
      { key: 'hvac-product', label: '产品中心', path: '/hvac', anchor: 'product' }
    ]
  },
  {
    key: 'energy', label: '综合能源节能', path: '/energy',
    children: [
      { key: 'energy-contract', label: '合同能源管理', path: '/energy', anchor: 'contract' },
      { key: 'energy-other', label: '其他能源节能', path: '/energy', anchor: 'other' }
    ]
  },
  {
    key: 'smart', label: '智慧能源管理', path: '/smart',
    children: [
      { key: 'smart-platform', label: '千牛卫管理平台', path: '/smart', anchor: 'platform' },
      { key: 'smart-twin', label: '数字孪生系统', path: '/smart', anchor: 'twin' },
      { key: 'smart-device', label: '智慧设备', path: '/smart', anchor: 'device' },
      { key: 'smart-hall', label: '数字展厅', path: '/smart', anchor: 'hall' }
    ]
  },
  { key: 'household', label: '智能家居', path: '/household' },
  {
    key: 'case', label: '项目案例', path: '/case',
    children: [
      { key: 'case-industry', label: '行业分类', path: '/case', anchor: 'industry' },
      { key: 'case-content', label: '案例展示', path: '/case', anchor: 'content' }
    ]
  },
  {
    key: 'news', label: '新闻资讯', path: '/news',
    children: [
      { key: 'news-company', label: '公司新闻', path: '/news', anchor: 'company' },
      { key: 'news-policy', label: '政策资讯', path: '/news', anchor: 'policy' }
    ]
  },
  { key: 'alliance', label: '生态联盟', path: '/alliance' },
  { key: 'about', label: '关于我们', path: '/about' }
]
