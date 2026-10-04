// 被前台当作内容区块、却建成 group 的栏目 —— 改为 list，并去掉其下无人读取的孙栏目
//
// 原 mock 把这几个区块建成「分组 + 若干单页孙栏目」，但前台装配只取页面的直接子栏目内容
// （PortalCmsService.pageContent），孙栏目里填什么都不会出现在官网上；
// 而 group 类型在后台没有编辑页、侧边栏也不让点，区块本身的内容又无处可改。
// 已上线的库由迁移 1790000009000-FlattenContentGroups 同步，该迁移内保留一份冻结副本

/** 改为列表栏目的区块（前台按条目渲染） */
export const FLATTEN_TO_LIST = ['energy-contract', 'energy-other', 'smart-platform']

/** 改为单页栏目的区块（前台只取一条，如页面头图） */
export const FLATTEN_TO_SINGLE = ['banner-smart']

/** 上述栏目改类型后使用的表单字段：与 toPageItemVo 读取的列对齐 */
export const FLATTENED_FORM_FIELDS: Record<string, string[]> = {
  list: ['title', 'description', 'content', 'cover', 'video', 'link', 'isTop'],
  single: ['title', 'cover', 'link'],
}

export const FLATTENED_LIST_COLUMNS = ['sort', 'title', 'createTime', 'isTop']

/** 被拍平栏目的 key 集合，用于在种子里跳过其孙栏目 */
export const FLATTENED_KEYS = new Set([...FLATTEN_TO_LIST, ...FLATTEN_TO_SINGLE])
