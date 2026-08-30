// 前台栏目页内容 Mock —— 中瑞恒真实业务数据，对齐 admin channel/content 结构
// 8 个一级栏目页（hvac/energy/smart/household/case/news/alliance/about）按 key 取数
// 列表数据均含 sort 字段，前台按需排序后展示

/** 栏目页 Hero 区 */
export interface PageHero {
  eyebrow: string
  title: string
  desc: string
  /** 背景图地址（来自后台 Banner 配置），为空时用默认浅色样式 */
  bg?: string
}

/** 通用图文条目 */
export interface PageItem {
  id: number
  title: string
  desc?: string
  tag?: string
  image?: string
  date?: string
  sort: number
}

/** 栏目页内容块 */
export interface PageBlock {
  anchor: string
  heading: string
  subheading?: string
  /** 展示形态：cards 卡片 / list 列表 / tags 标签云 / steps 流程 / rich 富文本段落 */
  layout: 'cards' | 'list' | 'tags' | 'steps' | 'rich'
  /** 板块背景图地址（来自后台配置），为空时用默认浅色/白底 */
  bg?: string
  items: PageItem[]
}

/** 单个栏目页完整内容 */
export interface PageContent {
  key: string
  hero: PageHero
  blocks: PageBlock[]
}

/** 所有栏目页内容集合，按 key 索引 */
export const pageContents: Record<string, PageContent> = {}

// 暖通空调产品（产品类别 + 产品中心）—— 数据源自 admin content.js hvac-*
const hvac: PageContent = {
  key: 'hvac',
  hero: {
    eyebrow: '暖通空调产品',
    title: '高效暖通空调系统集成',
    desc: '汇集主流品牌优质设备，提供从冷热源到末端的整体暖通解决方案，覆盖商用、工业、精密环境等多种场景。'
  },
  blocks: [
    {
      anchor: 'category',
      heading: '产品类别',
      subheading: '覆盖冷热源、末端、特种空调全系列设备',
      layout: 'cards',
      items: [
        { id: 1, title: '多联机、单元机', desc: '灵活分区控制，适配办公、商业等中小空间制冷供暖需求。', sort: 6 },
        { id: 2, title: '冷水机组、热泵机组', desc: '大型集中式冷热源设备，满足楼宇与园区的高负荷需求。', sort: 5 },
        { id: 3, title: '空调末端设备', desc: '风机盘管、组合式空调机组等，保障室内舒适送风。', sort: 4 },
        { id: 4, title: '精密空调', desc: '面向数据机房、实验室的恒温恒湿精密环境控制。', sort: 3 },
        { id: 5, title: '锅炉', desc: '高效燃气/电锅炉，提供稳定的供暖与热水热源。', sort: 2 },
        { id: 6, title: '直燃机', desc: '燃气直燃型溴化锂机组，制冷供暖一体化。', sort: 1 }
      ]
    },
    {
      anchor: 'product',
      heading: '产品中心',
      subheading: '精选大金等品牌主力机型',
      layout: 'list',
      items: [
        { id: 11, title: '大金 VRV 水源热泵系列', tag: '大金', desc: '利用水源高效换热，节能环保，适用于有稳定水源的建筑。', sort: 3 },
        { id: 12, title: '大金 VRV 更新用 Q 系列', tag: '大金', desc: '面向旧系统改造，无需更换管线即可升级，施工便捷。', sort: 2 },
        { id: 13, title: '大金 VRV 大空间用系列', tag: '大金', desc: '专为高大空间设计，送风距离远，温度分布均匀。', sort: 1 }
      ]
    }
  ]
}

// 综合能源节能（合同能源管理 + 其他能源节能）
const energy: PageContent = {
  key: 'energy',
  hero: {
    eyebrow: '综合能源节能',
    title: '合同能源管理与综合节能服务',
    desc: '以 EMC 合同能源管理模式，零投资为客户实施节能改造，共享节能收益，助力双碳目标落地。'
  },
  blocks: [
    {
      anchor: 'contract',
      heading: '合同能源管理（EMC）',
      subheading: '客户零投入，节能效益共享',
      layout: 'steps',
      items: [
        { id: 1, title: '简介', desc: '由节能服务公司投资节能改造，以节省的能源费用回收投资并获取利润的市场化机制。', sort: 6 },
        { id: 2, title: '优势', desc: '客户无需前期投资，节能改造风险由服务方承担，效益可量化、可监测。', sort: 5 },
        { id: 3, title: '相关政策', desc: '符合国家节能减排与双碳战略导向，享受相关财税与补贴支持政策。', sort: 4 },
        { id: 4, title: '优势和特点', desc: '一站式能源审计、方案设计、设备投资、施工运维，全周期闭环服务。', sort: 3 },
        { id: 5, title: '前景和价值', desc: '在用能成本持续上行背景下，节能改造的长期经济与环境价值显著。', sort: 2 },
        { id: 6, title: '全托管', desc: '能源系统全托管运营，专业团队保障稳定高效运行，客户专注主业。', sort: 1 }
      ]
    },
    {
      anchor: 'other',
      heading: '其他能源节能管理',
      subheading: '多元化节能技术与服务',
      layout: 'cards',
      items: [
        { id: 11, title: '能源审计诊断', desc: '专业团队现场勘察，出具能源审计报告与节能改造建议。', sort: 4 },
        { id: 12, title: '系统集成实施', desc: '暖通空调与能源系统的设计、设备选型与工程实施。', sort: 3 },
        { id: 13, title: '智能运维监控', desc: '7×24 小时远程监控，保障能源系统稳定高效运行。', sort: 2 },
        { id: 14, title: '节能效果评估', desc: '量化节能数据，定期评估节能效果并持续优化。', sort: 1 }
      ]
    }
  ]
}

pageContents.hvac = hvac
pageContents.energy = energy
// 智慧能源管理（千牛卫平台 / 数字孪生 / 智慧设备 / 数字展厅）
const smart: PageContent = {
  key: 'smart',
  hero: {
    eyebrow: '智慧能源管理',
    title: '千牛卫智慧能源管理平台',
    desc: '以数字孪生与物联网技术重构能源系统，实现能耗实时监测、智能调度与精细化运营管理。'
  },
  blocks: [
    {
      anchor: 'platform',
      heading: '千牛卫管理平台',
      subheading: '建筑能源全生命周期数字化管理',
      layout: 'list',
      items: [
        { id: 1, title: '千牛卫故事', desc: '源于一线节能实践，沉淀为可复制的数字化能源管理产品。', sort: 6 },
        { id: 2, title: '运营数据', desc: '实时采集能耗数据，多维度能效报表辅助运营决策。', sort: 5 },
        { id: 3, title: '管理系统', desc: '设备、能耗、告警、工单一体化管理，集中管控分散能源点。', sort: 4 },
        { id: 4, title: '技术方案', desc: '基于物联网与边缘计算的端云协同能源管理架构。', sort: 3 },
        { id: 5, title: '部署方案', desc: '支持公有云、私有化等多种部署，平滑接入既有系统。', sort: 2 },
        { id: 6, title: '客户价值', desc: '平均节能率 20%+，降低运维成本，提升能源资产透明度。', sort: 1 }
      ]
    },
    {
      anchor: 'twin',
      heading: '数字孪生系统',
      subheading: '物理能源系统的虚拟镜像',
      layout: 'rich',
      items: [
        { id: 11, title: '三维可视化', desc: '将建筑机电与能源系统 1:1 还原为三维模型，运行状态一目了然。', sort: 2 },
        { id: 12, title: '仿真与预测', desc: '基于实时数据进行负荷预测与运行仿真，提前优化调度策略。', sort: 1 }
      ]
    },
    {
      anchor: 'device',
      heading: '智慧设备',
      subheading: '感知与执行的物联终端',
      layout: 'cards',
      items: [
        { id: 21, title: '智能网关', desc: '多协议接入，打通不同品牌设备的数据孤岛。', sort: 3 },
        { id: 22, title: '能耗计量仪表', desc: '高精度分项计量，支撑精细化能源核算。', sort: 2 },
        { id: 23, title: '智能控制器', desc: '联动冷热源与末端，实现按需供给与自动调节。', sort: 1 }
      ]
    },
    {
      anchor: 'hall',
      heading: '数字展厅',
      subheading: '沉浸式能源管理成果展示',
      layout: 'rich',
      items: [
        { id: 31, title: '数据大屏', desc: '汇聚多项目运营数据，集中呈现节能成效与碳减排成果。', sort: 1 }
      ]
    }
  ]
}

// 智能家居（单页栏目）
const household: PageContent = {
  key: 'household',
  hero: {
    eyebrow: '智能家居',
    title: '舒适节能的智慧人居环境',
    desc: '聚焦舒适与节能并重的人居环境，融合暖通、新风、智能控制，打造绿色健康的智慧家居空间。'
  },
  blocks: [
    {
      anchor: 'feature',
      heading: '核心能力',
      subheading: '让家更舒适、更节能、更智能',
      layout: 'cards',
      items: [
        { id: 1, title: '舒适温控', desc: '分区温湿度智能调节，全屋四季如春。', sort: 4 },
        { id: 2, title: '新风净化', desc: '智能新风系统持续换气，保障室内空气品质。', sort: 3 },
        { id: 3, title: '能耗管理', desc: '家庭能耗可视化，智能策略自动节能降耗。', sort: 2 },
        { id: 4, title: '一体化控制', desc: '一个 App 统一管理全屋暖通与能源设备。', sort: 1 }
      ]
    }
  ]
}

pageContents.smart = smart
pageContents.household = household
// 项目案例（行业分类 + 案例展示）—— 数据源自 admin content.js case-*
const casePage: PageContent = {
  key: 'case',
  hero: {
    eyebrow: '项目案例',
    title: '深耕多行业的节能服务实践',
    desc: '服务覆盖医疗卫生、教育文体、政府事业单位、商业办公等多个领域，累计交付节能项目 500+。'
  },
  blocks: [
    {
      anchor: 'industry',
      heading: '行业分类',
      subheading: '按行业领域划分的服务版图',
      layout: 'tags',
      items: [
        { id: 1, title: '医疗卫生', sort: 4 },
        { id: 2, title: '教育文体', sort: 3 },
        { id: 3, title: '政府/事业单位', sort: 2 },
        { id: 4, title: '商业/办公楼/厂房', sort: 1 }
      ]
    },
    {
      anchor: 'content',
      heading: '案例展示',
      subheading: '精选典型节能改造与能源管理项目',
      layout: 'cards',
      items: [
        { id: 11, title: '三甲医院能源托管项目', tag: '医疗卫生', desc: '中央空调群控改造 + 能源托管，综合节能率达 22%。', date: '2024-03', sort: 3 },
        { id: 12, title: '高校后勤智慧能源平台', tag: '教育文体', desc: '建设校园能源监测平台，实现分项计量与精细管理。', date: '2023-11', sort: 2 },
        { id: 13, title: '产业园区综合能源项目', tag: '商业/办公楼/厂房', desc: '多能互补能源站建设，年减少碳排放数千吨。', date: '2023-08', sort: 1 }
      ]
    }
  ]
}

// 新闻资讯（公司新闻 + 政策资讯）
const news: PageContent = {
  key: 'news',
  hero: {
    eyebrow: '新闻资讯',
    title: '公司动态与行业政策',
    desc: '了解中瑞恒最新动态，把握节能行业政策风向与发展趋势。'
  },
  blocks: [
    {
      anchor: 'company',
      heading: '公司新闻',
      subheading: '企业动态与项目进展',
      layout: 'list',
      items: [
        { id: 1, title: '中瑞恒入选国家专精特新"小巨人"企业', desc: '凭借在智慧能源领域的持续创新，公司成功入选国家级专精特新名单。', date: '2024-12-10', sort: 3 },
        { id: 2, title: '千牛卫平台完成 V3.0 版本升级', desc: '新版本强化数字孪生与 AI 调度能力，运营效率进一步提升。', date: '2024-10-18', sort: 2 },
        { id: 3, title: '公司与多所高校共建能源技术联合实验室', desc: '推动产学研深度融合，加速节能技术成果转化。', date: '2024-08-05', sort: 1 }
      ]
    },
    {
      anchor: 'policy',
      heading: '政策资讯',
      subheading: '节能减排与双碳相关政策解读',
      layout: 'list',
      items: [
        { id: 11, title: '《"十四五"节能减排综合工作方案》要点解读', desc: '明确重点行业节能目标，合同能源管理迎来发展机遇。', date: '2024-11-20', sort: 2 },
        { id: 12, title: '公共机构能源审计相关政策更新', desc: '强化公共机构用能管理，能源审计需求持续增长。', date: '2024-09-12', sort: 1 }
      ]
    }
  ]
}

pageContents.case = casePage
pageContents.news = news
// 生态联盟（合作伙伴/成员）—— 复用合作伙伴数据语义
const alliance: PageContent = {
  key: 'alliance',
  hero: {
    eyebrow: '生态联盟',
    title: '共建智慧能源产业生态',
    desc: '携手设备厂商、技术伙伴与行业机构，共建开放协作的智慧能源产业生态联盟。'
  },
  blocks: [
    {
      anchor: 'partner',
      heading: '合作伙伴',
      subheading: '主流暖通空调与能源设备品牌',
      layout: 'tags',
      items: [
        { id: 1, title: '大金空调', sort: 6 },
        { id: 2, title: '格力电器', sort: 5 },
        { id: 3, title: '美的楼宇', sort: 4 },
        { id: 4, title: '约克空调', sort: 3 },
        { id: 5, title: '开利空调', sort: 2 },
        { id: 6, title: '麦克维尔', sort: 1 }
      ]
    },
    {
      anchor: 'join',
      heading: '加入联盟',
      subheading: '开放协作，共享节能价值',
      layout: 'cards',
      items: [
        { id: 11, title: '技术协同', desc: '联合研发节能技术与解决方案，推动行业标准建设。', sort: 3 },
        { id: 12, title: '资源共享', desc: '共享项目资源与渠道，拓展业务协作空间。', sort: 2 },
        { id: 13, title: '生态共赢', desc: '构建上下游协同的产业生态，实现伙伴共同成长。', sort: 1 }
      ]
    }
  ]
}

// 关于我们（单页栏目）
const about: PageContent = {
  key: 'about',
  hero: {
    eyebrow: '关于我们',
    title: '您身边专业的智慧能源提供商',
    desc: '中瑞恒(北京)科技有限公司，国家高新技术企业、国家专精特新"小巨人"企业，立足智慧能源领域，以数字化方式重构能源系统。'
  },
  blocks: [
    {
      anchor: 'profile',
      heading: '公司简介',
      layout: 'rich',
      items: [
        { id: 1, title: '公司概况', desc: '中瑞恒(北京)科技有限公司立足智慧能源领域，以数字化的方式重构能源系统，为用户提供暖通空调系统集成、合同能源管理（EMC）、综合能源节能服务、能源托管运营及智慧能源管理等多场景数智解决方案，促进能源高效利用，推动能源产业数智化转型和能源技术变革。', sort: 1 }
      ]
    },
    {
      anchor: 'honor',
      heading: '资质荣誉',
      subheading: '行业认可与技术实力',
      layout: 'tags',
      items: [
        { id: 11, title: '国家高新技术企业', sort: 4 },
        { id: 12, title: '专精特新"小巨人"', sort: 3 },
        { id: 13, title: '50+ 技术专利', sort: 2 },
        { id: 14, title: '13 年行业深耕', sort: 1 }
      ]
    },
    {
      anchor: 'social',
      heading: '社会贡献',
      subheading: '践行绿色低碳发展使命',
      layout: 'cards',
      items: [
        { id: 21, title: '助力双碳目标', desc: '累计为客户减少碳排放数万吨，践行绿色低碳发展使命。', sort: 3 },
        { id: 22, title: '产学研合作', desc: '与多所高校共建能源技术联合实验室，推动行业技术进步。', sort: 2 },
        { id: 23, title: '公益节能科普', desc: '走进社区与校园，开展节能环保知识普及公益活动。', sort: 1 }
      ]
    }
  ]
}

pageContents.alliance = alliance
pageContents.about = about

