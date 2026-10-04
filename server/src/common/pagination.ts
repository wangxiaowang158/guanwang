// 分页公共件 —— 各模块的后台列表共用同一套入参清洗与响应结构
// 抽出来的原因：分页参数来自 URL，非数字经 Number() 会变 NaN，
// 而 NaN 参与 Math.min/max 仍是 NaN，直接进 take() 会拼出非法 SQL 打 500

/** 后台列表的分页响应结构，前端按此解析 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * 取正整数，非法值（NaN / 负数 / 零 / 小数）回落到默认值
 * @param value 待校验值
 * @param fallback 非法时采用的默认值
 */
export function positiveInt(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const n = Math.floor(value)
  return n >= 1 ? n : fallback
}

/**
 * 夹取页码与每页条数
 * @param page 页码
 * @param pageSize 每页条数
 * @param options 默认值与上限
 */
export function resolvePaging(
  page: number | undefined,
  pageSize: number | undefined,
  options: { defaultSize: number; maxSize: number },
): { page: number; pageSize: number; skip: number } {
  const safePage = positiveInt(page, 1)
  const safeSize = Math.min(positiveInt(pageSize, options.defaultSize), options.maxSize)
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize }
}
