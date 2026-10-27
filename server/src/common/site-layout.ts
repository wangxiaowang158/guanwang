// 首页布局与页脚配置（site_config.homeLayout / footerConfig）的结构定义与净化
// 与 content-extra 同一思路：以 JSON 文本存库，入库出库都过 normalize，
// 只保留白名单键、限长限量，前台拿到的永远是形态确定的对象

/** 首屏之后可排序的首页板块，数组顺序即默认顺序（框架图第三版 + 项目案例） */
export const HOME_SECTIONS = ['business-trio', 'advantage', 'case', 'news', 'partner', 'view', 'contact'] as const
export type HomeSectionKey = (typeof HOME_SECTIONS)[number]

/** 板块底色；auto 为模板默认 */
export const HOME_TONES = ['auto', 'white', 'surface', 'dark'] as const
export type HomeTone = (typeof HOME_TONES)[number]

/**
 * 允许深色底的板块：这几块内容都在白色卡片里，深色底上依然可读；
 * 战略合作（分组名、Logo 墙）、新闻（更多按钮）、联系（表单）直接压在底色上，深色底对比度不够
 */
export const DARK_TONE_SECTIONS: readonly HomeSectionKey[] = ['business-trio', 'advantage', 'case', 'view']

/** 首页板块配置项 */
export interface HomeSectionConfig {
  key: HomeSectionKey
  visible: boolean
  /** 小标题覆盖；为空用栏目名或内置文案 */
  eyebrow?: string
  /** 主标题覆盖；为空用区块副标题或内置文案 */
  title?: string
  tone: HomeTone
}

/** 社交账号类型 */
export const SOCIAL_TYPES = ['wechat', 'weibo', 'douyin', 'channels', 'bilibili', 'linkedin'] as const
export type SocialType = (typeof SOCIAL_TYPES)[number]

export interface FooterLink {
  name: string
  url: string
}

export interface FooterSocial {
  type: SocialType
  /** 主页链接（http/https） */
  url?: string
  /** 二维码图片（站内路径或 http/https） */
  qr?: string
}

export interface FooterConfig {
  /** 页脚显示哪些一级导航分栏（栏目 key，按此顺序）；为空表示全部 */
  columns: string[]
  friendLinks: FooterLink[]
  socials: FooterSocial[]
}

const MAX_TEXT = 100
const MAX_URL = 500
const MAX_LIST = 30

/** 取有限长度的非空字符串，否则 undefined */
function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s.slice(0, max) : undefined
}

/** 外链：只放行 http(s) 绝对地址 */
function httpUrl(v: unknown): string | undefined {
  const s = str(v, MAX_URL)
  return s && /^https?:\/\/[^\s\\]+$/i.test(s) ? s : undefined
}

/**
 * 素材地址：站内 / 开头（不允许 // 与 \）或 http(s) 绝对地址，挡掉 javascript: 等伪协议
 * 另禁引号、括号与空白：背景图会被拼进 CSS url('…')，这些字符能提前闭合并注入样式
 */
export function assetUrl(v: unknown): string | undefined {
  const s = str(v, MAX_URL)
  if (!s || /['"()\s\\]/.test(s)) return undefined
  if (/^\/(?!\/)/.test(s)) return s
  return httpUrl(s)
}

/** 解析库中 JSON 文本，或直接接收对象；失败返回 undefined */
function parse(input: unknown): unknown {
  if (typeof input !== 'string') return input
  if (!input.trim()) return undefined
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

/**
 * 首页布局：去重、剔除未知板块，未出现的板块按默认顺序补在末尾且默认显示
 * （以后新增板块时，已保存过布局的站点不会把新板块藏起来）；
 * 已保存的布局以联系板块收尾时，补的板块插在联系之前，联系仍是页面收口
 * @param input 数组，或其 JSON 文本；为空返回默认布局
 */
export function normalizeHomeLayout(input: unknown): HomeSectionConfig[] {
  const raw = parse(input)
  const out: HomeSectionConfig[] = []
  const seen = new Set<string>()
  if (Array.isArray(raw)) {
    for (const it of raw) {
      if (!it || typeof it !== 'object') continue
      const o = it as Record<string, unknown>
      const key = o.key as HomeSectionKey
      if (!(HOME_SECTIONS as readonly unknown[]).includes(key) || seen.has(key)) continue
      seen.add(key)
      let tone = (HOME_TONES as readonly unknown[]).includes(o.tone) ? (o.tone as HomeTone) : 'auto'
      if (tone === 'dark' && !DARK_TONE_SECTIONS.includes(key)) tone = 'auto'
      const item: HomeSectionConfig = { key, visible: o.visible !== false, tone }
      const eyebrow = str(o.eyebrow, MAX_TEXT)
      const title = str(o.title, MAX_TEXT)
      if (eyebrow) item.eyebrow = eyebrow
      if (title) item.title = title
      out.push(item)
    }
  }
  const missing = HOME_SECTIONS.filter(key => !seen.has(key)).map(key => ({ key, visible: true, tone: 'auto' as const }))
  const endsWithContact = out.length > 0 && out[out.length - 1].key === 'contact'
  if (endsWithContact) out.splice(out.length - 1, 0, ...missing)
  else out.push(...missing)
  return out
}

/** 页脚配置：链接只放行 http(s)，二维码只放行站内路径或 http(s)，各列表最多 30 项 */
export function normalizeFooterConfig(input: unknown): FooterConfig {
  const raw = parse(input)
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const columns: string[] = []
  if (Array.isArray(o.columns)) {
    for (const k of o.columns) {
      const s = str(k, 64)
      if (s && /^[a-z][a-z0-9-]*$/.test(s) && !columns.includes(s)) columns.push(s)
      if (columns.length >= MAX_LIST) break
    }
  }

  const friendLinks: FooterLink[] = []
  if (Array.isArray(o.friendLinks)) {
    for (const it of o.friendLinks) {
      if (!it || typeof it !== 'object') continue
      const l = it as Record<string, unknown>
      const name = str(l.name, MAX_TEXT)
      const url = httpUrl(l.url)
      if (name && url) friendLinks.push({ name, url })
      if (friendLinks.length >= MAX_LIST) break
    }
  }

  const socials: FooterSocial[] = []
  if (Array.isArray(o.socials)) {
    for (const it of o.socials) {
      if (!it || typeof it !== 'object') continue
      const s = it as Record<string, unknown>
      if (!(SOCIAL_TYPES as readonly unknown[]).includes(s.type)) continue
      const url = httpUrl(s.url)
      const qr = assetUrl(s.qr)
      // 链接与二维码都没有的账号前台无从展示，不保存
      if (!url && !qr) continue
      const item: FooterSocial = { type: s.type as SocialType }
      if (url) item.url = url
      if (qr) item.qr = qr
      socials.push(item)
      if (socials.length >= MAX_LIST) break
    }
  }

  return { columns, friendLinks, socials }
}
