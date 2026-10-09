// 卡片上的业务线 / 行业标签：取自条目 extra，缺省时不显示
import type { PageItem } from '@/api/page'
import { businessLabel } from '@/config/businessLines'

/**
 * 取条目的业务线与行业展示标签
 * @param item 栏目页条目
 * @returns 先业务线后行业，均无则为空数组
 */
export function chipsOf(item: PageItem): string[] {
  const extra = item.extra
  if (!extra) return []
  const chips: string[] = []
  const biz = businessLabel(extra.business)
  if (biz) chips.push(biz)
  if (Array.isArray(extra.industries)) {
    for (const name of extra.industries) if (name) chips.push(name)
  }
  return chips
}
