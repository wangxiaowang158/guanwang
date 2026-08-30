// 栏目配置 Mock —— 同时驱动侧边栏菜单与页面渲染
// type: group(纯父级) / list(列表+编辑) / single(单条富文本) / siteconfig / admins
//       members / feedback / authconfig / loginlog（会员中心四项，走真实后端）
// formFields / listColumns 存字段 key，前端按 FIELD_DEFS 解析
// PART_TREE

let seed = 1000
const genId = () => ++seed

// 预设字段集（编辑页字段 key），减少重复配置
const F = {
  news: ['title', 'keywords', 'description', 'content', 'cover', 'updateTime', 'author', 'source', 'isTop'],
  single: ['title', 'keywords', 'description', 'content', 'cover', 'updateTime', 'author', 'source', 'isTop'],
  intro: ['title', 'keywords', 'description', 'cover', 'file', 'updateTime', 'author', 'source', 'isTop'],
  business: ['title', 'subtitle', 'intro', 'cover', 'whiteCover', 'link', 'updateTime', 'author', 'source', 'isTop'],
  customer: ['title', 'keywords', 'description', 'cover', 'updateTime', 'author', 'source', 'isTop'],
  category: ['name', 'updateTime', 'author', 'source', 'isTop'],
  product: ['category', 'brand', 'title', 'keywords', 'description', 'cover', 'updateTime', 'author', 'source', 'isTop'],
  banner: ['title', 'keywords', 'description', 'link', 'cover', 'updateTime', 'author', 'source', 'isTop']
}
// 列表列预设
const C = {
  std: ['sort', 'title', 'createTime', 'isTop'],
  category: ['index', 'sort', 'name', 'brand', 'createTime', 'isTop']
}

// 嵌套定义 → 扁平数组（自动分配 id / parentId / sort）
let channels = []
function build(list, parentId) {
  list.forEach((node, idx) => {
    const id = genId()
    const { children, ...rest } = node
    channels.push({
      id,
      parentId: parentId || null,
      sort: idx + 1,
      type: node.type || 'group',
      formFields: node.formFields || (node.type === 'list' || node.type === 'single' ? F.single : []),
      listColumns: node.listColumns || C.std,
      ...rest
    })
    if (children && children.length) build(children, id)
  })
}

build([
  { key: 'siteinfo', name: '基本信息管理', type: 'siteconfig', icon: 'SettingOutlined' },
  { key: 'home', name: '首页', icon: 'HomeOutlined',
    seoTitle: '中瑞恒 - 您身边专业的智慧能源提供商',
    seoKeywords: '智慧能源,综合能源节能,暖通空调,合同能源管理',
    seoDescription: '中瑞恒专注智慧能源综合服务，提供暖通空调、综合能源节能、智慧能源管理一站式解决方案。',
    children: [
    { key: 'home-intro', name: '简介', type: 'list', formFields: F.intro },
    { key: 'home-business', name: '主营业务', type: 'list', formFields: F.business },
    { key: 'home-customer', name: '典型客户', type: 'list', formFields: F.customer },
    { key: 'home-view', name: '我眼中的中瑞恒', type: 'list', formFields: F.intro }
  ] },
  { key: 'hvac', name: '暖通空调产品', icon: 'AppstoreOutlined',
    seoTitle: '暖通空调产品 - 中瑞恒',
    seoKeywords: '暖通空调,多联机,冷水机组,热泵机组,精密空调',
    seoDescription: '中瑞恒暖通空调产品涵盖多联机、冷水机组、热泵机组、精密空调等，满足多场景制冷供热需求。',
    children: [
    { key: 'hvac-category', name: '产品类别', type: 'list', formFields: F.category, listColumns: C.category },
    { key: 'hvac-product', name: '产品管理', type: 'list', formFields: F.product }
  ] },
  { key: 'energy', name: '综合能源节能', icon: 'ThunderboltOutlined',
    seoTitle: '综合能源节能 - 中瑞恒',
    seoKeywords: '综合能源节能,合同能源管理,EMC,节能改造',
    seoDescription: '中瑞恒提供合同能源管理与综合能源节能服务，以专业方案助力企业降本增效、绿色低碳。',
    children: [
    { key: 'energy-contract', name: '合同能源管理', children: [
      { key: 'energy-c-intro', name: '简介', type: 'single' },
      { key: 'energy-c-adv', name: '优势', type: 'single' },
      { key: 'energy-c-policy', name: '相关政策', type: 'single' },
      { key: 'energy-c-feature', name: '优势和特点', type: 'single' },
      { key: 'energy-c-value', name: '前景和价值', type: 'single' },
      { key: 'energy-c-trust', name: '全托管', type: 'single' },
      { key: 'energy-c-case', name: '服务案例链接', type: 'list' }
    ] },
    { key: 'energy-other', name: '其他能源节能管理', children: [
      { key: 'energy-o-intro', name: '简介', type: 'single' }
    ] }
  ] },
  { key: 'smart', name: '智慧能源管理', icon: 'ClusterOutlined',
    seoTitle: '智慧能源管理 - 中瑞恒',
    seoKeywords: '智慧能源管理,千牛卫,数字孪生,智慧设备,数字展厅',
    seoDescription: '中瑞恒智慧能源管理依托千牛卫平台与数字孪生技术，实现能源运营数据化、可视化、智能化。',
    children: [
    { key: 'smart-platform', name: '千牛卫管理平台', children: [
      { key: 'smart-p-story', name: '千牛卫故事', type: 'single' },
      { key: 'smart-p-data', name: '运营数据', type: 'single' },
      { key: 'smart-p-system', name: '管理系统', type: 'single' },
      { key: 'smart-p-tech', name: '技术方案', type: 'single' },
      { key: 'smart-p-deploy', name: '部署方案', type: 'single' },
      { key: 'smart-p-value', name: '客户价值', type: 'single' },
      { key: 'smart-p-video', name: '案例视频', type: 'list' }
    ] },
    { key: 'smart-twin', name: '数字孪生系统', type: 'single' },
    { key: 'smart-device', name: '智慧设备', type: 'single' },
    { key: 'smart-hall', name: '数字展厅', type: 'single' }
  ] },
  { key: 'household', name: '智能家居', type: 'single', icon: 'WifiOutlined',
    seoTitle: '智能家居 - 中瑞恒',
    seoKeywords: '智能家居,智能控制,舒适人居',
    seoDescription: '中瑞恒智能家居打造舒适、节能、便捷的未来人居环境，提供一体化智能控制方案。' },
  { key: 'case', name: '项目案例', icon: 'ProjectOutlined',
    seoTitle: '项目案例 - 中瑞恒',
    seoKeywords: '项目案例,医疗卫生,教育文体,商业办公,节能改造案例',
    seoDescription: '中瑞恒服务覆盖医疗卫生、教育文体、政府事业单位、商业办公等多行业，沉淀大量节能与智慧能源标杆案例。',
    children: [
    { key: 'case-industry', name: '行业分类', type: 'list' },
    { key: 'case-category', name: '类别分类', type: 'list' },
    { key: 'case-content', name: '案例内容', type: 'list', formFields: F.news }
  ] },
  { key: 'news', name: '新闻资讯', icon: 'ReadOutlined',
    seoTitle: '新闻资讯 - 中瑞恒',
    seoKeywords: '新闻资讯,公司新闻,政策资讯,行业动态',
    seoDescription: '关注中瑞恒最新公司新闻与节能政策资讯，了解智慧能源行业动态与企业发展。',
    children: [
    { key: 'news-company', name: '公司新闻', type: 'list', formFields: F.news },
    { key: 'news-policy', name: '政策资讯', type: 'list', formFields: F.news }
  ] },
  { key: 'alliance', name: '生态联盟', type: 'list', icon: 'TeamOutlined', formFields: F.customer,
    seoTitle: '生态联盟 - 中瑞恒',
    seoKeywords: '生态联盟,合作伙伴,产业生态',
    seoDescription: '中瑞恒携手上下游合作伙伴共建智慧能源产业生态，开放协作、合作共赢。' },
  { key: 'about', name: '关于我们', type: 'single', icon: 'IdcardOutlined',
    seoTitle: '关于我们 - 中瑞恒',
    seoKeywords: '关于中瑞恒,公司简介,企业介绍',
    seoDescription: '了解中瑞恒的发展历程、企业实力与服务理念，专业的智慧能源综合服务提供商。' },
  { key: 'banner', name: 'Banner管理', icon: 'PictureOutlined', children: [
    { key: 'banner-home', name: '首页 Banner', type: 'single', formFields: F.banner },
    { key: 'banner-hvac', name: '暖通空调产品 Banner', type: 'single', formFields: F.banner },
    { key: 'banner-energy', name: '综合能源节能 Banner', type: 'single', formFields: F.banner },
    { key: 'banner-smart', name: '智慧能源管理 Banner', children: [
      { key: 'banner-s-platform', name: '千牛卫管理平台 Banner', type: 'single', formFields: F.banner },
      { key: 'banner-s-twin', name: '数字孪生系统 Banner', type: 'single', formFields: F.banner },
      { key: 'banner-s-device', name: '智能设备 Banner', type: 'single', formFields: F.banner }
    ] },
    { key: 'banner-case', name: '项目案例 Banner', type: 'single', formFields: F.banner },
    { key: 'banner-news', name: '新闻资讯 Banner', type: 'single', formFields: F.banner },
    { key: 'banner-alliance', name: '生态联盟 Banner', type: 'single', formFields: F.banner },
    { key: 'banner-about', name: '关于我们 Banner', type: 'single', formFields: F.banner }
  ] },
  // 会员中心：四个子模块读写真实后端（/api/mgmt/*），不经 Mock
  { key: 'member-center', name: '会员中心', type: 'group', icon: 'TeamOutlined', children: [
    { key: 'member', name: '会员管理', type: 'members' },
    { key: 'feedback', name: '意见反馈', type: 'feedback' },
    { key: 'auth-config', name: '注册登录配置', type: 'authconfig' },
    { key: 'login-log', name: '登录日志', type: 'loginlog' }
  ] },
  { key: 'admin', name: '管理员管理', type: 'admins', icon: 'UserOutlined' }
], null)

export const __getChannels = () => channels

const now = () => new Date().toLocaleString('zh-CN', { hour12: false })

export default [
  // 栏目树（扁平数组，前端自行组装）
  {
    url: '/api/channel/list',
    method: 'get',
    response: () => ({ code: 200, message: '获取成功', data: channels })
  },
  // 单个栏目（按 key 查）
  {
    url: '/api/channel/detail',
    method: 'get',
    response: ({ query }) => {
      const ch = channels.find(c => c.key === query.key || c.id === Number(query.id))
      return ch
        ? { code: 200, message: '获取成功', data: ch }
        : { code: 404, message: '栏目不存在', data: null }
    }
  },
  {
    url: '/api/channel/add',
    method: 'post',
    response: ({ body }) => {
      const id = genId()
      const item = {
        id,
        parentId: body.parentId || null,
        key: body.key || 'ch-' + id,
        name: body.name,
        type: body.type || 'list',
        icon: body.icon || '',
        sort: body.sort ?? channels.length + 1,
        formFields: body.formFields || ['title', 'content', 'updateTime', 'isTop'],
        listColumns: body.listColumns || ['sort', 'title', 'createTime', 'isTop'],
        seoTitle: body.seoTitle || '',
        seoKeywords: body.seoKeywords || '',
        seoDescription: body.seoDescription || '',
        updateTime: now()
      }
      channels.push(item)
      return { code: 200, message: '新增成功', data: item }
    }
  },
  {
    url: '/api/channel/update',
    method: 'put',
    response: ({ body }) => {
      const ch = channels.find(c => c.id === body.id)
      if (ch) Object.assign(ch, body, { updateTime: now() })
      return { code: 200, message: '更新成功', data: null }
    }
  },
  {
    url: '/api/channel/delete',
    method: 'delete',
    response: ({ query }) => {
      const id = Number(query.id)
      // 级联删除子节点
      const toRemove = new Set([id])
      let changed = true
      while (changed) {
        changed = false
        channels.forEach(c => {
          if (c.parentId && toRemove.has(c.parentId) && !toRemove.has(c.id)) {
            toRemove.add(c.id)
            changed = true
          }
        })
      }
      channels = channels.filter(c => !toRemove.has(c.id))
      return { code: 200, message: '删除成功', data: null }
    }
  }
]
