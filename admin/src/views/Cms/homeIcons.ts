// 首页「业务与行业」「技术服务」的图标选项 —— 取值即前台图标库的图标名
//
// ⚠️ 名单须与 web/src/config/homeIcons.ts 保持一致：前台只认这些名称，
// 这边多一个前台没有的，运营选了前台不显示；这边少一个，前台有的也选不到。

/** 图标下拉选项：label 为业务含义，value 为前台图标名 */
export const HOME_ICON_OPTIONS = [
  { label: '指南针（咨询规划）', value: 'Compass' },
  { label: '芯片（智能控制）', value: 'Cpu' },
  { label: '齿轮（设备运维）', value: 'Setting' },
  { label: '房屋（建筑节能）', value: 'House' },
  { label: '数据分析', value: 'DataAnalysis' },
  { label: '工具（技术服务）', value: 'Tools' },
  { label: '显示器（监测平台）', value: 'Monitor' },
  { label: '趋势图（能效提升）', value: 'TrendCharts' },
  { label: '闪电（电力能源）', value: 'Lightning' },
  { label: '太阳（新能源）', value: 'Sunny' },
  { label: '仪表盘（能耗计量）', value: 'Odometer' },
  { label: '连接（系统集成）', value: 'Connection' },
  { label: '柱状图（运营数据）', value: 'Histogram' },
  { label: '办公楼（公共建筑）', value: 'OfficeBuilding' },
  { label: '客服（售后支持）', value: 'Service' },
  { label: '奖章（资质荣誉）', value: 'Medal' },
]
