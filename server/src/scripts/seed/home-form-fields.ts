// 首页板块栏目的表单字段 —— 与 home-section.service.ts 的取数口径逐一对齐
// 原先这些栏目沿用通用表单，前台要读的列（业绩单位、伙伴 Logo/链接、简介正文）后台填不了，
// 后台能填的列（关键字、封面、作者）前台又不读。这里只列前台真正消费的字段。
// 已上线的库由迁移 1790000007000-AlignHomeFormFields 同步，该迁移内保留一份冻结副本

/** 栏目 key → 表单字段（顺序即后台表单顺序） */
export const HOME_FORM_FIELDS: Record<string, string[]> = {
  'home-intro': ['title', 'subtitle', 'content'],
  'home-philosophy': ['title', 'content'],
  'home-business': ['icon', 'title', 'description', 'isTop'],
  'home-product': ['name', 'subtitle', 'content', 'cover', 'isTop'],
  'home-service': ['icon', 'title', 'description', 'isTop'],
  'home-customer': ['title', 'whiteCover', 'link', 'isTop'],
  'home-achievement': ['title', 'subtitle', 'description', 'isTop'],
  'home-social': ['title', 'description', 'cover', 'isTop'],
  'home-view': ['title', 'description', 'cover', 'link', 'isTop'],
}

/**
 * 首页板块标题：栏目名作板块小标题，区块副标题作板块主标题
 * 取值即改版前写在前台模板里的文案，初始化后前台观感不变；之后运营在栏目管理里改
 * 迁移 1790000010000-HomeSectionHeadings 内保留一份冻结副本
 */
export const HOME_HEADINGS: Record<string, { name: string; subheading: string | null }> = {
  'home-intro': { name: '公司简介', subheading: null },
  'home-business': { name: '业务与行业', subheading: '覆盖能源全链路的专业服务方向' },
  'home-product': { name: '主要产品', subheading: '面向建筑能源全生命周期的核心产品' },
  'home-service': { name: '技术支持及服务', subheading: '全周期的专业能源技术服务' },
  'home-philosophy': { name: '经营理念', subheading: null },
  'home-achievement': { name: '公司业绩', subheading: '用数据说话的专业积累' },
  'home-customer': { name: '合作伙伴', subheading: '与主流品牌携手共建能源生态' },
  'home-view': { name: '我眼中的中瑞恒', subheading: '媒体与行业的关注和认可' },
  'home-social': { name: '社会贡献', subheading: '践行绿色低碳发展使命' },
}

/** 列表列：主要产品以 name 为标题列，其余沿用 title */
export const HOME_LIST_COLUMNS: Record<string, string[]> = {
  'home-product': ['sort', 'name', 'createTime', 'isTop'],
}
