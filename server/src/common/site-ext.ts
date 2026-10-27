// 站点扩展配置 —— 统计与站长验证、全站灰色模式、悬浮咨询条、图片水印
//
// 为什么合成一个 JSON 列：这几组开关彼此独立、字段还会再加，逐列加要逐列写迁移；
// 与 homeLayout / footerConfig 同样走「入库白名单净化 + 出库再净化」的口径。
//
// 为什么统计只收 ID 而不收任意代码：网关 CSP 为 script-src 'self'，任意内联脚本本就跑不起来；
// 放开内联等于把后台账号失窃直接升级成全站存储型 XSS。只收 ID，脚本地址由前台拼成固定的官方域名，
// CSP 只需额外放行这几个域名

/** 全站灰色模式 */
export interface GrayModeConfig {
  /** 手动开关，开启后立即生效直到关闭 */
  enabled: boolean
  /** 按日期区间自动生效（YYYY-MM-DD，含首尾两天）；与手动开关任一满足即生效 */
  start?: string
  end?: string
}

/** 悬浮咨询条 */
export interface FloatBarConfig {
  /** 是否显示悬浮条，默认显示 */
  enabled: boolean
  /** 是否显示电话按钮（号码取基本信息里的电话） */
  showPhone: boolean
  /** 是否显示微信二维码按钮（二维码取基本信息里的公众号二维码） */
  showWechat: boolean
  /** 在线客服链接（第三方客服的会话页地址，新窗口打开），为空不显示 */
  kefuUrl?: string
}

/** 上传图片处理（水印 / 转 WebP）：仅作用于此后新上传的图片 */
export interface WatermarkConfig {
  enabled: boolean
  /** 水印文字，为空时取公司简称 */
  text?: string
  /** 位置 */
  position: WatermarkPosition
  /** 新上传的图片转存为 WebP（体积通常小 30% 以上）；与水印相互独立 */
  webp: boolean
}

export const WATERMARK_POSITIONS = ['bottom-right', 'bottom-left', 'center'] as const
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number]

export interface SiteExtConfig {
  /** 百度统计站点 ID（hm.js?后面那串 32 位十六进制） */
  baiduTongji?: string
  /** Google Analytics 4 衡量 ID，如 G-XXXXXXX */
  gaId?: string
  /** 站长平台验证码：只收 content 值，标签由后端拼 */
  verify: {
    baidu?: string
    google?: string
    bing?: string
    so360?: string
    sogou?: string
  }
  grayMode: GrayModeConfig
  floatBar: FloatBarConfig
  watermark: WatermarkConfig
}

/** 站长验证 meta 名，key 与 SiteExtConfig.verify 对应 */
export const VERIFY_META_NAMES: Record<keyof SiteExtConfig['verify'], string> = {
  baidu: 'baidu-site-verification',
  google: 'google-site-verification',
  bing: 'msvalidate.01',
  so360: '360-site-verification',
  sogou: 'sogou_site_verification',
}

const BAIDU_ID = /^[a-f0-9]{32}$/i
const GA_ID = /^G-[A-Z0-9]{4,20}$/
/** 验证码：各家都是字母数字与 -_. 组成，限定字符集使其拼进 meta 时无需担心转义 */
const VERIFY_CODE = /^[A-Za-z0-9_.-]{4,100}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function parse(input: unknown): Record<string, unknown> {
  let v = input
  if (typeof v === 'string') {
    try {
      v = v.trim() ? JSON.parse(v) : {}
    } catch {
      v = {}
    }
  }
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function match(v: unknown, re: RegExp): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return re.test(s) ? s : undefined
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

/** 外链：只放行 http(s)，并禁引号尖括号与空白，杜绝拼进 href 时闭合属性 */
function httpUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.trim().slice(0, 500)
  return /^https?:\/\/[^\s"'<>\\]+$/i.test(s) ? s : undefined
}

/** 日期：形态合法且确实存在（挡掉 2026-02-31） */
function date(v: unknown): string | undefined {
  const s = match(v, DATE)
  if (!s) return undefined
  // 按 UTC 构造再回转比对：Date 会把 2 月 31 日静默进位成 3 月，回转后对不上即非法
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : undefined
}

/**
 * 白名单净化：未知字段丢弃，非法值置空，缺省给默认值
 * @param input 对象或其 JSON 文本
 */
export function normalizeSiteExt(input: unknown): SiteExtConfig {
  const raw = parse(input)
  const verifyRaw = obj(raw.verify)
  const verify: SiteExtConfig['verify'] = {}
  for (const key of Object.keys(VERIFY_META_NAMES) as Array<keyof SiteExtConfig['verify']>) {
    const code = match(verifyRaw[key], VERIFY_CODE)
    if (code) verify[key] = code
  }

  const grayRaw = obj(raw.grayMode)
  const grayMode: GrayModeConfig = { enabled: bool(grayRaw.enabled, false) }
  const start = date(grayRaw.start)
  const end = date(grayRaw.end)
  // 只填一端或首尾颠倒都视作未设区间，免得出现「设了却永远不生效」或「永远生效」
  if (start && end && start <= end) {
    grayMode.start = start
    grayMode.end = end
  }

  const floatRaw = obj(raw.floatBar)
  const floatBar: FloatBarConfig = {
    enabled: bool(floatRaw.enabled, true),
    showPhone: bool(floatRaw.showPhone, true),
    showWechat: bool(floatRaw.showWechat, true),
  }
  const kefuUrl = httpUrl(floatRaw.kefuUrl)
  if (kefuUrl) floatBar.kefuUrl = kefuUrl

  const wmRaw = obj(raw.watermark)
  const position = WATERMARK_POSITIONS.find(p => p === wmRaw.position) ?? 'bottom-right'
  const watermark: WatermarkConfig = { enabled: bool(wmRaw.enabled, false), position, webp: bool(wmRaw.webp, false) }
  if (typeof wmRaw.text === 'string' && wmRaw.text.trim()) watermark.text = wmRaw.text.trim().slice(0, 30)

  const result: SiteExtConfig = { verify, grayMode, floatBar, watermark }
  const baidu = match(raw.baiduTongji, BAIDU_ID)
  if (baidu) result.baiduTongji = baidu.toLowerCase()
  const ga = match(raw.gaId, GA_ID)
  if (ga) result.gaId = ga
  return result
}

/**
 * 灰色模式当前是否生效
 * 日期按东八区自然日比较：运营填的「4 月 4 日」指的是北京时间那一天，服务器时区未必是东八区
 * @param now 当前时刻
 */
export function isGrayActive(cfg: GrayModeConfig, now = new Date()): boolean {
  if (cfg.enabled) return true
  if (!cfg.start || !cfg.end) return false
  const today = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10)
  return today >= cfg.start && today <= cfg.end
}

/** 前台可见的扩展配置：水印是上传侧配置，不下发 */
export interface PublicSiteExt {
  baiduTongji?: string
  gaId?: string
  /** 灰色模式此刻是否生效（服务端算好，前台不依赖访客本机时钟） */
  grayActive: boolean
  floatBar: FloatBarConfig
}

export function toPublicSiteExt(cfg: SiteExtConfig, now = new Date()): PublicSiteExt {
  const pub: PublicSiteExt = { grayActive: isGrayActive(cfg.grayMode, now), floatBar: cfg.floatBar }
  if (cfg.baiduTongji) pub.baiduTongji = cfg.baiduTongji
  if (cfg.gaId) pub.gaId = cfg.gaId
  return pub
}
