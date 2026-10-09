// 结构化区块的数据汇总 —— 从区块条目的 extra 中取出各形态所需数据，样式一/二的内容块与栏目页共用
import type { ExtraItem, ExtraMetric, ExtraPain, ExtraQuote, PageBlock } from '@/api/page'

/** 由 extra 驱动、不直接渲染条目本身的区块形态 */
const EXTRA_LAYOUTS = new Set<PageBlock['layout']>(['pains', 'flow', 'metrics', 'modes', 'quote', 'gallery'])

/** 是否结构化区块 */
export const isExtraLayout = (layout: PageBlock['layout']): boolean => EXTRA_LAYOUTS.has(layout)

/** 汇总所有条目 extra 中同名数组字段，按条目顺序拼接 */
function concatField<T>(block: PageBlock, pick: (extra: NonNullable<PageBlock['items'][number]['extra']>) => T[] | undefined): T[] {
  const out: T[] = []
  for (const item of block.items) {
    const list = item.extra ? pick(item.extra) : undefined
    // 过滤 null/非对象元素：后端净化后不会出现，但渲染层不该因脏数据整块抛错
    if (Array.isArray(list)) out.push(...list.filter((x) => x != null))
  }
  return out
}

/** 汇总痛点方案 */
export const painsOf = (block: PageBlock): ExtraPain[] => concatField(block, e => e.pains)

/** 汇总流程步骤 */
export const stepsOf = (block: PageBlock): ExtraItem[] => concatField(block, e => e.steps)

/** 汇总指标 */
export const metricsOf = (block: PageBlock): ExtraMetric[] => concatField(block, e => e.metrics)

/** 汇总合作模式 */
export const modesOf = (block: PageBlock): ExtraItem[] => concatField(block, e => e.modes)

/** 汇总证言：只保留有正文的条目 */
export const quotesOf = (block: PageBlock): ExtraQuote[] =>
  block.items.map(it => it.extra?.quote).filter((q): q is ExtraQuote => !!q?.text)

/** 汇总图集：拼接所有条目的图片地址，过滤空串 */
export const galleryOf = (block: PageBlock): string[] => {
  const out: string[] = []
  for (const item of block.items) {
    const list = item.extra?.gallery
    if (!Array.isArray(list)) continue
    for (const url of list) if (typeof url === 'string' && url) out.push(url)
  }
  return out
}

/**
 * 区块是否有可渲染内容
 * 结构化区块看汇总后的数据；普通区块看条目数（视频区块另需有视频地址由内容块自行处理）
 */
export function blockHasContent(block: PageBlock): boolean {
  switch (block.layout) {
    case 'pains': return painsOf(block).length > 0
    case 'flow': return stepsOf(block).length > 0
    case 'metrics': return metricsOf(block).length > 0
    case 'modes': return modesOf(block).length > 0
    case 'quote': return quotesOf(block).length > 0
    case 'gallery': return galleryOf(block).length > 0
    default: return block.items.length > 0
  }
}
