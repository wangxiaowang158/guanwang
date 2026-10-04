// 「产品类别」下拉的取值来源 —— 声明某栏目的 category 字段从哪个分类栏目取选项
//
// 存在原因：category 原先是自由文本，而前台按该值与分类栏目名精确比对做筛选，
// 手输一旦多个空格或用了同义词（「锅炉」/「燃气锅炉」），前台就筛不出内容，
// 且后台界面完全看不出异常。改成下拉是为了从录入端消除这类不一致。
//
// ⚠️ 本表须与前台 web/src/config/channelFilters.ts 的 CHANNEL_FILTERS 保持一致：
// 那边声明「分类栏目筛哪个内容栏目」，这边声明「内容栏目的类别从哪个分类栏目取」，
// 是同一层关系的两个方向。改动一侧务必同步另一侧，否则筛选会静默失效。

/** 内容栏目 key → 提供选项的分类栏目 key */
export const CATEGORY_SOURCES: Record<string, string> = {
  'hvac-product': 'hvac-category',
  'case-content': 'case-industry',
}

/**
 * 取某栏目的类别选项来源
 * @param channelKey 内容栏目 key
 * @returns 分类栏目 key，未配置该关系时返回空串
 */
export function categorySourceOf(channelKey: string): string {
  return CATEGORY_SOURCES[channelKey] ?? ''
}
