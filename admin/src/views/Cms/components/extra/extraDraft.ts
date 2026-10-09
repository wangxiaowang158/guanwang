// 扩展字段的表单草稿与 ContentExtra 互转
// 表单里各控件编辑的是「全字符串」的草稿，提交时再收敛为 ContentExtra：空值不提交
import type { BusinessLine, ContentExtra } from '@/api/cms'

/** 行数据：列 key → 文本 */
export type ExtraRow = Record<string, string | undefined>

/** 列配置 */
export interface ExtraColumn {
  key: string
  label: string
  /** 控件类型，默认单行输入 */
  type?: 'input' | 'textarea' | 'image'
  placeholder?: string
  maxlength?: number
  required?: boolean
}

/** 条数上限，与后端 normalizeExtra 一致 */
export const EXTRA_MAX_ROWS = 30

/** 表单草稿：各控件直接读写 */
export interface ExtraDraft {
  business: BusinessLine | undefined
  industries: string[]
  tags: string[]
  metrics: ExtraRow[]
  pains: ExtraRow[]
  steps: ExtraRow[]
  modes: ExtraRow[]
  facts: ExtraRow[]
  /** 每张图一行，列 key 固定为 url */
  gallery: ExtraRow[]
  quote: ExtraRow
}

/** 各列表型字段的列配置 */
export const EXTRA_COLUMNS: Record<'metrics' | 'pains' | 'steps' | 'modes' | 'facts' | 'gallery', ExtraColumn[]> = {
  metrics: [
    { key: 'label', label: '指标名称', maxlength: 100, required: true, placeholder: '如 年节电量' },
    { key: 'value', label: '数值', maxlength: 100, required: true, placeholder: '如 120' },
    { key: 'unit', label: '单位', maxlength: 20, placeholder: '如 万度' },
    { key: 'note', label: '备注', maxlength: 100, placeholder: '选填' },
  ],
  pains: [
    { key: 'title', label: '痛点', maxlength: 100, required: true, placeholder: '一句话概括客户痛点' },
    { key: 'desc', label: '痛点说明', type: 'textarea', maxlength: 1000 },
    { key: 'solution', label: '解决方案', type: 'textarea', maxlength: 1000 },
    { key: 'value', label: '量化价值', type: 'textarea', maxlength: 1000 },
  ],
  steps: [
    { key: 'title', label: '步骤名称', maxlength: 100, required: true },
    { key: 'desc', label: '步骤说明', type: 'textarea', maxlength: 1000 },
  ],
  modes: [
    { key: 'title', label: '模式名称', maxlength: 100, required: true },
    { key: 'desc', label: '模式说明', type: 'textarea', maxlength: 1000 },
  ],
  facts: [
    { key: 'label', label: '名称', maxlength: 100, required: true, placeholder: '如 建筑面积' },
    { key: 'value', label: '内容', maxlength: 100, required: true, placeholder: '如 12 万平方米' },
  ],
  gallery: [{ key: 'url', label: '图片', type: 'image', required: true }],
}

/** 空草稿 */
export const emptyDraft = (): ExtraDraft => ({
  business: undefined,
  industries: [],
  tags: [],
  metrics: [],
  pains: [],
  steps: [],
  modes: [],
  facts: [],
  gallery: [],
  quote: {},
})

/** 后端返回的结构化行 → 草稿行（只取白名单列，值缺省补空串） */
const toRows = (list: object[] | undefined, columns: ExtraColumn[]): ExtraRow[] =>
  (list ?? []).map((item) => {
    const src = item as Record<string, unknown>
    const row: ExtraRow = {}
    for (const col of columns) {
      const v = src[col.key]
      row[col.key] = typeof v === 'string' ? v : ''
    }
    return row
  })

/** ContentExtra → 草稿，用于编辑回填 */
export function extraToDraft(extra: ContentExtra | null | undefined): ExtraDraft {
  const e = extra ?? {}
  return {
    business: e.business,
    industries: [...(e.industries ?? [])],
    tags: [...(e.tags ?? [])],
    metrics: toRows(e.metrics, EXTRA_COLUMNS.metrics),
    pains: toRows(e.pains, EXTRA_COLUMNS.pains),
    steps: toRows(e.steps, EXTRA_COLUMNS.steps),
    modes: toRows(e.modes, EXTRA_COLUMNS.modes),
    facts: toRows(e.facts, EXTRA_COLUMNS.facts),
    // 旧数据里混入非字符串项时直接丢掉，避免后面 trim 抛错
    gallery: (e.gallery ?? []).filter((url): url is string => typeof url === 'string').map((url) => ({ url })),
    quote: { text: e.quote?.text ?? '', author: e.quote?.author ?? '', org: e.quote?.org ?? '' },
  }
}

const clean = (v: string | undefined): string => (v ?? '').trim()

/** 必填列任一为空则丢弃该行；选填列为空则不带该键 */
function packRows<T extends object>(rows: ExtraRow[], columns: ExtraColumn[]): T[] {
  const out: T[] = []
  for (const row of rows) {
    if (columns.some((c) => c.required && !clean(row[c.key]))) continue
    const item: Record<string, string> = {}
    for (const c of columns) {
      const v = clean(row[c.key])
      if (v) item[c.key] = v
    }
    out.push(item as T)
  }
  return out.slice(0, EXTRA_MAX_ROWS)
}

/**
 * 草稿 → 提交用 ContentExtra：空值不提交
 * @param draft 表单草稿
 * @param keys 当前栏目启用的扩展字段：只覆盖这些键，未启用字段沿用 base 的旧值，避免被误清
 * @param base 记录原有的 extra（新增时为空）
 * @returns 全空时返回 null（后端据此清空 extra）
 */
export function draftToExtra(
  draft: ExtraDraft,
  keys: readonly string[],
  base?: ContentExtra | null,
): ContentExtra | null {
  const has = (k: string) => keys.includes(k)
  const extra: ContentExtra = { ...(base ?? {}) }
  // 启用的字段先清掉旧值，再按草稿重写：用户删空即等于清除
  for (const k of keys) delete (extra as Record<string, unknown>)[k]

  if (has('business') && draft.business) extra.business = draft.business
  if (has('industries') && draft.industries.length) extra.industries = draft.industries
  if (has('tags') && draft.tags.length) extra.tags = draft.tags
  const lists = ['metrics', 'pains', 'steps', 'modes', 'facts'] as const
  for (const k of lists) {
    if (!has(k)) continue
    const rows = packRows<never>(draft[k], EXTRA_COLUMNS[k])
    if (rows.length) (extra as Record<string, unknown>)[k] = rows
  }
  if (has('gallery')) {
    const urls = draft.gallery.map((r) => clean(r.url)).filter(Boolean)
    if (urls.length) extra.gallery = urls.slice(0, EXTRA_MAX_ROWS)
  }
  if (has('quote') && clean(draft.quote.text)) {
    extra.quote = { text: clean(draft.quote.text) }
    if (clean(draft.quote.author)) extra.quote.author = clean(draft.quote.author)
    if (clean(draft.quote.org)) extra.quote.org = clean(draft.quote.org)
  }
  return Object.keys(extra).length ? extra : null
}
