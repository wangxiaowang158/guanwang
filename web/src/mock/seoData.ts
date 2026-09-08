// 栏目页 SEO 配置 Mock —— 对齐 admin 后台 channel.js 各顶级栏目的 seoTitle / seoKeywords / seoDescription
// 后台按栏目录入，前台据此输出页面标题与搜索引擎信息；键为一级栏目 key，与路由 name 一致

/** 单个栏目的 SEO 配置 */
export interface SeoConfig {
  /** 页面标题，写入 document.title */
  title: string
  /** 关键词，写入 meta[name=keywords] */
  keywords: string
  /** 页面描述，写入 meta[name=description] */
  description: string
}

/** 各顶级栏目的 SEO 配置，key 与前台路由 name 对应 */
export const seoConfigs: Record<string, SeoConfig> = {
  home: {
    title: '中瑞恒 - 您身边专业的智慧能源提供商',
    keywords: '智慧能源,综合能源节能,暖通空调,合同能源管理',
    description: '中瑞恒专注智慧能源综合服务，提供暖通空调、综合能源节能、智慧能源管理一站式解决方案。'
  },
  hvac: {
    title: '暖通空调产品 - 中瑞恒',
    keywords: '暖通空调,多联机,冷水机组,热泵机组,精密空调',
    description: '中瑞恒暖通空调产品涵盖多联机、冷水机组、热泵机组、精密空调等，满足多场景制冷供热需求。'
  },
  energy: {
    title: '综合能源节能 - 中瑞恒',
    keywords: '综合能源节能,合同能源管理,EMC,节能改造',
    description: '中瑞恒提供合同能源管理与综合能源节能服务，以专业方案助力企业降本增效、绿色低碳。'
  },
  smart: {
    title: '智慧能源管理 - 中瑞恒',
    keywords: '智慧能源管理,千牛卫,数字孪生,智慧设备,数字展厅',
    description: '中瑞恒智慧能源管理依托千牛卫平台与数字孪生技术，实现能源运营数据化、可视化、智能化。'
  },
  household: {
    title: '智能家居 - 中瑞恒',
    keywords: '智能家居,智能控制,舒适人居',
    description: '中瑞恒智能家居打造舒适、节能、便捷的未来人居环境，提供一体化智能控制方案。'
  },
  case: {
    title: '项目案例 - 中瑞恒',
    keywords: '项目案例,医疗卫生,教育文体,商业办公,节能改造案例',
    description: '中瑞恒服务覆盖医疗卫生、教育文体、政府事业单位、商业办公等多行业，沉淀大量节能与智慧能源标杆案例。'
  },
  news: {
    title: '新闻资讯 - 中瑞恒',
    keywords: '新闻资讯,公司新闻,政策资讯,行业动态',
    description: '关注中瑞恒最新公司新闻与节能政策资讯，了解智慧能源行业动态与企业发展。'
  },
  alliance: {
    title: '生态联盟 - 中瑞恒',
    keywords: '生态联盟,合作伙伴,产业生态',
    description: '中瑞恒携手上下游合作伙伴共建智慧能源产业生态，开放协作、合作共赢。'
  },
  about: {
    title: '关于我们 - 中瑞恒',
    keywords: '关于中瑞恒,公司简介,企业介绍',
    description: '了解中瑞恒的发展历程、企业实力与服务理念，专业的智慧能源综合服务提供商。'
  }
}
