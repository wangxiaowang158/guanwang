// 前台官网各列表板块 Mock 数据 —— 中瑞恒真实业务，按 SRS 3.5.1 字段定义

// 业务与行业（卡片：图标/标题/简述/排序）
export const businessList = [
  { id: 1, icon: 'Compass', title: '节能咨询设计服务', desc: '提供能源审计、节能诊断与系统优化设计，量身定制节能方案。', sort: 1 },
  { id: 2, icon: 'Cpu', title: '智慧能源综合服务', desc: '一体化能源托管运营，实现能源系统的智能调度与精细管理。', sort: 2 },
  { id: 3, icon: 'Setting', title: '智慧能源技术服务', desc: '基于数字孪生与物联网的能源系统技术支持与运维服务。', sort: 3 },
  { id: 4, icon: 'House', title: '未来人居环境服务', desc: '聚焦舒适与节能并重的人居环境，打造绿色智慧建筑空间。', sort: 4 }
]

// 主要产品（列表：名称/简介/特性点/图片/排序）
export const productList = [
  {
    id: 1, name: '千牛卫智慧能源管理平台', sort: 1,
    summary: '面向建筑能源全生命周期的数字化管理平台',
    features: ['实时能耗监测与分析', '智能调度与节能优化', '设备健康诊断预警', '多维度能效报表'],
    image: ''
  },
  {
    id: 2, name: '中央空调节能控制系统', sort: 2,
    summary: '基于负荷预测的中央空调群控节能系统',
    features: ['冷热源智能群控', '末端按需供给', '动态负荷预测', '平均节能率 20%+'],
    image: ''
  },
  {
    id: 3, name: '综合能源数智运营系统', sort: 3,
    summary: '多能互补的综合能源数据化运营解决方案',
    features: ['多能源协同管理', '碳排放核算', '能源成本优化', '运营可视化大屏'],
    image: ''
  }
]

// 技术支持及服务（列表：图标/标题/描述）
export const serviceList = [
  { id: 1, icon: 'DataAnalysis', title: '能源审计诊断', desc: '专业团队现场勘察，出具能源审计报告与节能改造建议。' },
  { id: 2, icon: 'Tools', title: '系统集成实施', desc: '暖通空调与能源系统的设计、设备选型与工程实施。' },
  { id: 3, icon: 'Monitor', title: '智能运维监控', desc: '7×24 小时远程监控，保障能源系统稳定高效运行。' },
  { id: 4, icon: 'TrendCharts', title: '节能效果评估', desc: '量化节能数据，定期评估节能效果并持续优化。' }
]

// 合作伙伴（Logo墙：名称/Logo/链接/排序）
export const partnerList = [
  { id: 1, name: '大金空调', logo: '', link: '', sort: 1 },
  { id: 2, name: '格力电器', logo: '', link: '', sort: 2 },
  { id: 3, name: '美的楼宇', logo: '', link: '', sort: 3 },
  { id: 4, name: '约克空调', logo: '', link: '', sort: 4 },
  { id: 5, name: '开利空调', logo: '', link: '', sort: 5 },
  { id: 6, name: '麦克维尔', logo: '', link: '', sort: 6 }
]

// 公司业绩（数字列表：数值/后缀/标签/排序）
export const achievementList = [
  { id: 1, value: 500, suffix: '+', label: '服务项目', sort: 1 },
  { id: 2, value: 20, suffix: '%+', label: '平均节能率', sort: 2 },
  { id: 3, value: 13, suffix: '年', label: '行业深耕', sort: 3 },
  { id: 4, value: 50, suffix: '+', label: '技术专利', sort: 4 }
]

// 社会贡献（图文卡片：标题/描述/图片/排序）
export const socialList = [
  { id: 1, title: '助力双碳目标', desc: '累计为客户减少碳排放数万吨，践行绿色低碳发展使命。', image: '', sort: 1 },
  { id: 2, title: '产学研合作', desc: '与多所高校共建能源技术联合实验室，推动行业技术进步。', image: '', sort: 2 },
  { id: 3, title: '公益节能科普', desc: '走进社区与校园，开展节能环保知识普及公益活动。', image: '', sort: 3 }
]
