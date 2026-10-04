// 分页入参清洗 —— 各后台列表共用，非法值必须回落而不是往 SQL 里带
// 实测过：NaN 进 TypeORM 的 skip()/take() 会抛 TypeORMError 打 500，故本文件重点盯 NaN
import { positiveInt, resolvePaging } from '../src/common/pagination'

describe('positiveInt', () => {
  it('正整数原样返回', () => {
    expect(positiveInt(5, 10)).toBe(5)
    expect(positiveInt(1, 10)).toBe(1)
  })

  it('NaN 回落默认值', () => {
    expect(positiveInt(Number.NaN, 10)).toBe(10)
  })

  it('Infinity 回落默认值', () => {
    expect(positiveInt(Number.POSITIVE_INFINITY, 10)).toBe(10)
    expect(positiveInt(Number.NEGATIVE_INFINITY, 10)).toBe(10)
  })

  it('零与负数回落默认值', () => {
    expect(positiveInt(0, 10)).toBe(10)
    expect(positiveInt(-1, 10)).toBe(10)
  })

  it('小数向下取整，取整后小于 1 的回落', () => {
    expect(positiveInt(3.9, 10)).toBe(3)
    expect(positiveInt(0.5, 10)).toBe(10)
  })

  it('undefined 回落默认值', () => {
    expect(positiveInt(undefined, 10)).toBe(10)
  })
})

describe('resolvePaging', () => {
  const opts = { defaultSize: 10, maxSize: 100 }

  it('正常入参按原值计算 skip', () => {
    expect(resolvePaging(3, 20, opts)).toEqual({ page: 3, pageSize: 20, skip: 40 })
  })

  it('不传参数时取默认值，skip 为 0', () => {
    expect(resolvePaging(undefined, undefined, opts)).toEqual({ page: 1, pageSize: 10, skip: 0 })
  })

  it('pageSize 超上限被夹到 maxSize', () => {
    expect(resolvePaging(1, 99999, opts).pageSize).toBe(100)
  })

  it('NaN 不会传染到 skip', () => {
    const r = resolvePaging(Number.NaN, Number.NaN, opts)
    expect(r).toEqual({ page: 1, pageSize: 10, skip: 0 })
    // 显式断言：skip 一旦是 NaN，TypeORM 会抛错而非降级
    expect(Number.isNaN(r.skip)).toBe(false)
  })

  it('负数页码与负数条数都回落', () => {
    expect(resolvePaging(-3, -20, opts)).toEqual({ page: 1, pageSize: 10, skip: 0 })
  })

  it('page 为 0 时回落到第 1 页', () => {
    expect(resolvePaging(0, 10, opts).page).toBe(1)
  })

  it('任意非法组合下 skip 恒为非负整数', () => {
    const inputs = [Number.NaN, 0, -1, 1.5, 99999, undefined]
    for (const page of inputs) {
      for (const pageSize of inputs) {
        const { skip } = resolvePaging(page, pageSize, opts)
        expect(Number.isInteger(skip)).toBe(true)
        expect(skip).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
