// 内容扩展数据（content.extra）的结构定义与净化
// 宽表通用列装不下的结构化信息（多标签、指标组、痛点方案、案例基础信息等）统一放这里，
// 以 JSON 文本存库。入库与出库都过 normalizeExtra：只保留白名单键、限长限量，
// 避免绕过后台直接打接口塞入任意结构，也让前台拿到的永远是形态确定的对象

/** 业务线取值，对应三大业务主线 */
export const BUSINESS_LINES = ['energy', 'building', 'living'] as const
export type BusinessLine = (typeof BUSINESS_LINES)[number]

/** 指标：量化价值看板、案例收益、首页数据条共用 */
export interface ExtraMetric {
  label: string
  value: string
  unit?: string
  note?: string
}

/** 痛点 → 解决方案 → 量化价值 */
export interface ExtraPain {
  title: string
  desc?: string
  solution?: string
  value?: string
}

/** 名称 + 说明的条目：流程步骤、合作模式、基础信息 */
export interface ExtraItem {
  title: string
  desc?: string
}

/** 键值对：案例基础信息（面积、业态、合作模式） */
export interface ExtraFact {
  label: string
  value: string
}

/** 客户证言 */
export interface ExtraQuote {
  text: string
  author?: string
  org?: string
}

export interface ContentExtra {
  /** 业务线，用于三大业务维度筛选 */
  business?: BusinessLine
  /** 所属行业（可多个），用于行业维度筛选 */
  industries?: string[]
  /** 自由标签，用于多标签组合筛选 */
  tags?: string[]
  metrics?: ExtraMetric[]
  pains?: ExtraPain[]
  steps?: ExtraItem[]
  modes?: ExtraItem[]
  facts?: ExtraFact[]
  /** 现场实拍、系统截图 */
  gallery?: string[]
  quote?: ExtraQuote
}

const MAX_LIST = 30
const MAX_TAG = 30
const MAX_SHORT = 100
const MAX_LONG = 1000
const MAX_URL = 1000

/** 取有限长度的非空字符串，否则 undefined */
function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s.slice(0, max) : undefined
}

/**
 * @param noComma 为真时丢弃含逗号的项：筛选参数以逗号分隔多值，
 *   含逗号的标签会被拆开，永远匹配不上原值
 */
function strList(v: unknown, maxItem: number, noComma = false): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: string[] = []
  for (const it of v) {
    const s = str(it, maxItem)
    if (s && noComma && /[,，]/.test(s)) continue
    if (s && !out.includes(s)) out.push(s)
    if (out.length >= MAX_LIST) break
  }
  return out.length ? out : undefined
}

function objList<T>(v: unknown, pick: (o: Record<string, unknown>) => T | undefined): T[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: T[] = []
  for (const it of v) {
    if (!it || typeof it !== 'object') continue
    const r = pick(it as Record<string, unknown>)
    if (r) out.push(r)
    if (out.length >= MAX_LIST) break
  }
  return out.length ? out : undefined
}

/** 去掉值为 undefined 的键，保证序列化后体积最小 */
function compact<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k]
  return o
}

/**
 * 把任意输入收敛为合法 ContentExtra；全空时返回 null（库里存 null 而非 "{}"）
 * @param input 对象，或其 JSON 文本（库中读出时是文本）
 */
export function normalizeExtra(input: unknown): ContentExtra | null {
  let raw = input
  if (typeof raw === 'string') {
    if (!raw.trim()) return null
    try {
      raw = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>

  const business = (BUSINESS_LINES as readonly unknown[]).includes(o.business)
    ? (o.business as BusinessLine)
    : undefined
  const q = o.quote && typeof o.quote === 'object' ? (o.quote as Record<string, unknown>) : null
  const quoteText = q ? str(q.text, MAX_LONG) : undefined

  const result = compact<ContentExtra>({
    business,
    industries: strList(o.industries, MAX_TAG, true),
    tags: strList(o.tags, MAX_TAG, true),
    metrics: objList<ExtraMetric>(o.metrics, (m) => {
      const label = str(m.label, MAX_SHORT)
      const value = str(m.value, MAX_SHORT)
      if (!label || !value) return undefined
      return compact({ label, value, unit: str(m.unit, 20), note: str(m.note, MAX_SHORT) })
    }),
    pains: objList<ExtraPain>(o.pains, (p) => {
      const title = str(p.title, MAX_SHORT)
      if (!title) return undefined
      return compact({
        title,
        desc: str(p.desc, MAX_LONG),
        solution: str(p.solution, MAX_LONG),
        value: str(p.value, MAX_LONG),
      })
    }),
    steps: objList<ExtraItem>(o.steps, itemPick),
    modes: objList<ExtraItem>(o.modes, itemPick),
    facts: objList<ExtraFact>(o.facts, (f) => {
      const label = str(f.label, MAX_SHORT)
      const value = str(f.value, MAX_SHORT)
      return label && value ? { label, value } : undefined
    }),
    // 图集地址只放行 http(s) 绝对地址与站内 / 开头的相对路径，挡掉 javascript: 等伪协议
    gallery: strList(o.gallery, MAX_URL)?.filter((u) => /^(https?:\/\/|\/(?!\/))/i.test(u)),
    quote: quoteText
      ? compact({ text: quoteText, author: str(q?.author, MAX_SHORT), org: str(q?.org, MAX_SHORT) })
      : undefined,
  })
  return Object.keys(result).length ? result : null
}

function itemPick(o: Record<string, unknown>): ExtraItem | undefined {
  const title = str(o.title, MAX_SHORT)
  if (!title) return undefined
  return compact({ title, desc: str(o.desc, MAX_LONG) })
}

/** 序列化入库；null 表示清空 */
export function serializeExtra(input: unknown): string | null {
  const e = normalizeExtra(input)
  return e ? JSON.stringify(e) : null
}

/** 多维筛选条件：维度之间 AND，同一维度内多个取值 OR */
export interface ExtraFilter {
  business?: string[]
  industry?: string[]
  tag?: string[]
}

/** 内容的 extra 是否满足筛选条件 */
export function matchExtra(extra: ContentExtra | null, f: ExtraFilter): boolean {
  if (f.business?.length && !(extra?.business && f.business.includes(extra.business))) return false
  if (f.industry?.length && !f.industry.some((i) => extra?.industries?.includes(i))) return false
  if (f.tag?.length && !f.tag.some((t) => extra?.tags?.includes(t))) return false
  return true
}
