// 前台官网 Mock 数据 —— 中瑞恒真实业务内容，结构与 admin 的 site/content 同构
// 各板块字段按 SRS 3.5.1 定义，前台只读展示

// 站点基本信息（字段对齐 admin mock/site.js）
export const siteInfo = {
  webTitle: '中瑞恒——让建筑更节能 让环境更舒适',
  keywords: '暖通空调系统集成,EMC合同能源管理,综合能源节能服务,能源托管运营,智慧能源管理',
  description: '国家高新技术企业、国家专精特新小巨人企业，立足智慧能源领域，以数字化方式重构能源系统。',
  slogan: '让建筑更节能　让环境更舒适',
  subSlogan: '您身边专业的智慧能源提供商',
  phone: '010-53608607',
  website: 'www.zruiheng.com',
  recruitEmail: 'zrh30000@126.com',
  contactEmail: 'hengmarketing@163.com',
  address: '北京市顺义区空港融慧园6号楼',
  mapLng: '116.56',
  mapLat: '40.09',
  wechatQr: '',
  icpCode: '京ICP备11010169号-1',
  policeCode: '京公网安备 11011302003456号',
  copyright: '© 中瑞恒(北京)科技有限公司',
  // 网站模板：'1' 样式一（深蓝科技风）| '2' 样式二（集团品牌风）
  template: '1',
  // 首页 Hero 背景媒体：视频优先于图片，二者皆空则用默认渐变背景
  // 示例图（unsplash 建筑/能源主题），实际由后台配置覆盖
  heroImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
  heroVideo: ''
}

// 公司简介（single 板块）
export const aboutSection = {
  title: '您身边专业的智慧能源提供商',
  subtitle: '国家高新技术企业 · 国家专精特新"小巨人"企业',
  content: '中瑞恒(北京)科技有限公司立足智慧能源领域，以数字化的方式重构能源系统，为用户提供暖通空调系统集成、合同能源管理（EMC）、综合能源节能服务、能源托管运营及智慧能源管理等多场景数智解决方案，促进能源高效利用，推动能源产业数智化转型和能源技术变革。'
}

// 经营理念（single 板块）
export const philosophySection = {
  title: '让建筑更节能　让环境更舒适',
  content: '我们坚持以技术创新驱动能源效率提升，以数据智能优化能源系统运行，致力于成为客户信赖的长期能源合作伙伴。在每一个项目中，我们用专业与责任，为客户创造可量化、可持续的节能价值。'
}
