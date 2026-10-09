// 新版官网内容种子 —— 文案取自《中瑞恒官网整体重建升级方案》，只写文档里给出的内容
// 方案里没有给出的数据（具体案例指标、证言原文、愿景使命正文）一律不编造，由市场部在后台补录
import type { ContentExtra } from '../../common/content-extra'
import type { ContentRow } from './content-rows'

/** 同一栏目内按数组顺序生成降序 sort（后台列表 sort 大者靠前） */
function rows(channelKey: string, items: Omit<ContentRow, 'channelKey' | 'sort'>[]): ContentRow[] {
  return items.map((it, i) => ({ ...it, channelKey, sort: items.length - i }))
}

/** 单条结构化内容：标题 + 扩展数据 */
function one(channelKey: string, title: string, extra: ContentExtra): ContentRow[] {
  return rows(channelKey, [{ title, extra }])
}

const ENERGY = 'business-energy'
const BUILDING = 'business-building'
const LIVING = 'business-living'

/** 智慧能源业务页 */
function energyRows(): ContentRow[] {
  return [
    ...one(`${ENERGY}-pains`, '智慧能源客户共性痛点', {
      pains: [
        {
          title: '冷热站、数据中心能耗居高不下，电费逐年上涨，无专业算法优化',
          solution: 'AI 全局前馈调控，多能耦合，系统 EER 提升至 6.5 以上',
          value: '电费降低 30%+',
        },
        {
          title: '机房运维人员短缺，巡检工作量大，设备故障无法提前预判',
          solution: 'WE-iDog 智能巡检机器人 + LLM 故障诊断大模型，实现无人值守',
          value: '运维成本下降 50%',
        },
        {
          title: '改造前期投入高，企业现金流压力大，节能收益无法快速兑现',
          solution: '小马哥 EMC 能源托管零投资模式，我方全额投资，共享节能收益',
          value: '零投资',
        },
        {
          title: '源/网/储/荷数据割裂，碳排、能耗台账人工统计，无法满足双碳考核',
          solution: 'WEI-EMS 全量能碳一体化平台，自动生成碳报表、能耗对标分析',
          value: '自动生成碳报表',
        },
      ],
    }),
    ...one(`${ENERGY}-flow`, '全链条服务流程', {
      steps: [
        { title: '咨询' }, { title: '设计' }, { title: '建造' }, { title: '调控' }, { title: '运维' },
      ],
    }),
    ...rows(`${ENERGY}-products`, [
      { title: '千牛卫', description: '泛能源数智化操作系统，能源行业专属“鸿蒙”。' },
      { title: '小马哥', description: 'EMC 能源托管，零投资模式。' },
      { title: 'WEI-EMS', description: '全量能碳一体化平台。' },
      { title: 'WE-iDog', description: '智能巡检机器人。' },
      { title: '图灵 BOX' },
      { title: 'iHeesd', description: '设计软件。' },
    ]),
    ...one(`${ENERGY}-metrics`, '智慧能源落地价值', {
      metrics: [
        { label: '服务中大型项目', value: '4000', unit: '+' },
        { label: '机房综合节能最高', value: '75', unit: '%' },
        { label: '电费降低', value: '30', unit: '%+' },
        { label: '运维成本下降', value: '50', unit: '%' },
      ],
    }),
    ...one(`${ENERGY}-modes`, '智慧能源合作模式', {
      modes: [
        { title: 'EMC 能源托管' }, { title: 'EPC 工程' }, { title: '设备销售' }, { title: '年度运维' },
      ],
    }),
  ]
}

/** 智慧建筑业务页：痛点与价值取自方案首页卡片2 */
function buildingRows(): ContentRow[] {
  return [
    ...one(`${BUILDING}-pains`, '智慧建筑客户共性痛点', {
      pains: [
        { title: '楼宇多系统独立' },
        { title: '运维繁琐' },
        { title: '安全预警滞后' },
        { title: '低碳改造难落地' },
      ],
    }),
    ...rows(`${BUILDING}-products`, [
      { title: 'IBESS', description: '一体化管控，安全 + 能源双闭环管理。' },
      { title: 'iBuilder', description: '数字孪生。' },
    ]),
    ...one(`${BUILDING}-modes`, '智慧建筑合作模式', {
      modes: [
        { title: 'BIM 深化设计' }, { title: '弱电 EPC' }, { title: '平台私有化部署' }, { title: '年度运营' },
      ],
    }),
  ]
}

/** 未来人居业务页：痛点与价值取自方案首页卡片3 */
function livingRows(): ContentRow[] {
  return [
    ...one(`${LIVING}-pains`, '未来人居客户共性痛点', {
      pains: [
        { title: '家装暖通设备分散' },
        { title: '温湿度失衡' },
        { title: '空气质量差' },
        { title: '全屋智能难联动' },
      ],
    }),
    ...rows(`${LIVING}-products`, [
      { title: '全屋五恒新风净水地暖', description: '一体化方案。' },
      { title: '房间边缘中枢', description: '云边协同智控。' },
    ]),
    ...one(`${LIVING}-modes`, '未来人居合作模式', {
      modes: [
        { title: '工装配套' }, { title: '家装整装' }, { title: '经销商渠道合作' },
      ],
    }),
  ]
}

/** 首页资质展示：只放方案里点名的资质，图片与证书由市场部在后台补录 */
function honorRows(): ContentRow[] {
  return rows('home-honor', [
    { title: '专精特新小巨人' },
    { title: '双高新企业' },
    { title: '新产品新技术' },
    { title: '国际先进' },
    { title: '专利与软件著作权' },
    { title: '央视报道储能项目' },
  ])
}

/** 九大行业：行业方案页的栏目条目，具体痛点与方案由业务部门在后台补录 */
function solutionRows(): ContentRow[] {
  const industries = ['医院', '高校', '政府机关', '商业园区', '交通', '洁净空间', '数据中心', '工业园区', '住宅']
  return rows('solutions-list', industries.map((name) => ({
    title: `${name}解决方案`,
    extra: { industries: [name] },
  })))
}

/** 新版官网全部内容行 */
export function buildV2ContentRows(): ContentRow[] {
  return [
    ...energyRows(),
    ...buildingRows(),
    ...livingRows(),
    ...honorRows(),
    ...solutionRows(),
  ]
}
