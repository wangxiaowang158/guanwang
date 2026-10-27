// 文章/案例详情的「相关推荐」—— 同栏目里业务线、行业相近的优先，不够再按列表顺序补齐
// 纯函数：输入候选与当前条目，输出排好序的推荐；取数在 PortalCmsService，便于单测
import { normalizeExtra, type ContentExtra } from '../../common/content-extra'
import type { Content } from './content.entity'
import type { ArticleRelatedVo } from './vo/cms.vo'

/** 推荐条数：一行四张卡，再多就成了第二个列表页 */
export const RELATED_LIMIT = 4

/** 相近度：同业务线 2 分，每个共同行业 1 分，每个共同标签 0.5 分 */
function score(a: ContentExtra | null, b: ContentExtra | null): number {
  if (!a || !b) return 0
  let s = 0
  if (a.business && a.business === b.business) s += 2
  const overlap = (x?: string[], y?: string[]) => (x && y ? x.filter(v => y.includes(v)).length : 0)
  s += overlap(a.industries, b.industries)
  s += overlap(a.tags, b.tags) * 0.5
  return s
}

/** 一句成效：取第一个量化指标，如「综合节能率 32%」 */
function highlightOf(extra: ContentExtra | null): string | undefined {
  const m = extra?.metrics?.[0]
  if (!m?.label || !m.value) return undefined
  return `${m.label} ${m.value}${m.unit ?? ''}`
}

/**
 * 从同栏目候选里挑相关推荐
 * @param current 当前详情
 * @param candidates 同栏目已发布、有正文的条目，按列表顺序（置顶 → 排序 → id）排好
 * @returns 至多 RELATED_LIMIT 条；相近度相同保持列表顺序
 */
export function pickRelated(current: Content, candidates: Content[]): ArticleRelatedVo[] {
  const base = normalizeExtra(current.extra)
  return candidates
    .filter(c => c.id !== current.id)
    .map((c, order) => ({ c, order, extra: normalizeExtra(c.extra) }))
    .map(x => ({ ...x, s: score(base, x.extra) }))
    // 稳定排序：分高在前，同分按原列表顺序
    .sort((a, b) => b.s - a.s || a.order - b.order)
    .slice(0, RELATED_LIMIT)
    .map(({ c, extra }) => ({
      id: c.id,
      title: c.title || c.name || '',
      image: c.cover || undefined,
      highlight: highlightOf(extra),
    }))
}
