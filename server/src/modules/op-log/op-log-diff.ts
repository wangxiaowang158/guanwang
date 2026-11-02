// 操作日志的「改前 / 改后」对比 —— 写操作前后各读一次目标记录，逐字段比出差异
// 只看请求参数分不清哪些字段真被改了、原来是什么，运营查问题时最需要的正是这两样
import { In, type DataSource, type EntityTarget, type ObjectLiteral } from 'typeorm'
import { Admin } from '../admin/admin.entity'
import { AdminRole } from '../admin/admin-role.entity'
import { AuthConfig } from '../auth-config/auth-config.entity'
import { Channel } from '../cms/channel.entity'
import { Content } from '../cms/content.entity'
import { ContentRevision } from '../cms/content-revision.entity'
import { SiteConfig } from '../cms/site-config.entity'
import { Feedback } from '../feedback/feedback.entity'
import { NotifyConfig } from '../feedback/notify-config.entity'
import { Member } from '../member/member.entity'
import { RedirectRule } from '../redirect/redirect.entity'

/** 一个字段的变化；值已转成展示用的字符串，null 表示空 */
export interface FieldChange {
  field: string
  label: string
  before: string | null
  after: string | null
}

/** 一条记录的变化 */
export interface RecordChange {
  /** 记录主键 */
  id: number
  /** 便于辨认的名称，如栏目名、内容标题；单例配置为空 */
  title: string | null
  /** update 为逐字段对比；remove 为删除前的完整内容 */
  mode: 'update' | 'remove'
  fields: FieldChange[]
}

/** 落库的变化记录 */
export interface OpLogChanges {
  /** 对象类型的中文名，如「栏目」 */
  target: string
  records: RecordChange[]
  /** 记录数或长度超限时为 true，界面提示「仅显示部分」 */
  truncated?: boolean
}

/** 请求里能用来定位记录的部分 */
export interface DiffRequest {
  body: unknown
  query: Record<string, unknown>
  params: Record<string, unknown>
  adminId: number
}
/** 字段中文名；未列出的字段直接显示字段名，宁可显示得糙也不漏记 */
type Labels = Record<string, string>

const ADMIN_LABELS: Labels = {
  account: '账号', name: '姓名', passwordHash: '密码', perms: '单独授权', roleId: '角色',
  isSuper: '超级管理员', wechatBound: '微信绑定',
}

const ROLE_LABELS: Labels = { name: '角色名', perms: '角色权限', remark: '说明' }

const AUTH_CONFIG_LABELS: Labels = {
  registerOpen: '开放注册', allowPasswordLogin: '允许账号密码登录', allowSmsLogin: '允许验证码登录',
  passwordMinLength: '密码最小长度', passwordRequireMixed: '密码须含字母与数字',
  captchaThreshold: '图形验证码触发次数', lockThreshold: '登录失败锁定次数', lockMinutes: '锁定时长（分钟）',
}

const CHANNEL_LABELS: Labels = {
  parentId: '上级栏目', key: '栏目标识', name: '栏目名称', type: '栏目类型', icon: '菜单图标',
  hidden: '隐藏', sort: '排序', formFields: '表单字段', listColumns: '列表列',
  seoTitle: 'SEO 标题', seoKeywords: 'SEO 关键词', seoDescription: 'SEO 描述',
  portalPath: '前台路径', anchor: '区块锚点', subheading: '副标题', layout: '展示形态',
  menuParent: '菜单归属', menuGroup: '菜单分组', menuDesc: '菜单说明',
  heroEyebrow: 'Hero 眉标题', heroTitle: 'Hero 主标题', heroDesc: 'Hero 描述',
  heroBg: 'Hero 背景图', heroVideo: 'Hero 背景视频', externalUrl: '外部链接',
  blockTone: '区块底色', blockBg: '区块背景图', blockColumns: '每行列数', headingAlign: '标题对齐',
}

const CONTENT_LABELS: Labels = {
  channelKey: '所属栏目', title: '标题', name: '名称', subtitle: '副标题', keywords: '关键词',
  description: '摘要', intro: '简介', content: '正文', cover: '封面图', video: '视频',
  whiteCover: '白底图', file: '附件', link: '跳转链接', category: '分类', icon: '图标',
  brand: '品牌', author: '作者', source: '来源', extra: '扩展字段', status: '状态',
  sort: '排序', isTop: '置顶', publishAt: '发布时间', deletedAt: '移入回收站时间',
}

const SITE_LABELS: Labels = {
  webTitle: '网站标题', keywords: '关键词', description: '描述', slogan: '主标语', subSlogan: '副标语',
  phone: '联系电话', website: '官网域名', recruitEmail: '招聘邮箱', contactEmail: '商务邮箱',
  address: '办公地址', mapLng: '地图经度', mapLat: '地图纬度', mapLink: '地图链接',
  copyright: '版权信息', icpCode: 'ICP 备案号', policeCode: '公安备案号', logo: '页头 Logo',
  footerLogo: '页脚 Logo', wechatQr: '公众号二维码', template: '网站样式', heroImage: '首屏背景图',
  heroVideo: '首屏背景视频', heroPrimaryText: '首屏主按钮文字', heroSecondaryText: '首屏次按钮文字',
  heroStatsNote: '数据口径说明', contactHeading: '联系板块标题', companyName: '公司全称',
  companyShort: '公司简称', companyEn: '公司英文名', favicon: '站点图标', shareImage: '默认分享图',
  homeLayout: '首页板块布局', footerConfig: '页脚配置', extConfig: '扩展配置',
}

const FEEDBACK_LABELS: Labels = {
  source: '来源', company: '单位', name: '姓名', phone: '电话', feedbackType: '反馈类型',
  leadType: '线索类型', email: '邮箱', position: '职位', content: '反馈内容', status: '状态',
}

const NOTIFY_LABELS: Labels = { webhookUrl: '机器人地址', type: '机器人类型' }

const MEMBER_LABELS: Labels = {
  phone: '手机号', nickname: '昵称', email: '邮箱', passwordHash: '密码', avatar: '头像',
  status: '状态', failedAttempts: '连续登录失败次数', lockedUntil: '锁定截止时间', deletedAt: '删除时间',
}

const REDIRECT_LABELS: Labels = {
  fromPath: '旧地址', toUrl: '新地址', statusCode: '跳转类型', enabled: '启用', remark: '备注',
}

/** 枚举值的中文；只收运营常看的几个，其余原样显示 */
const VALUE_LABELS: Record<string, Record<string, string>> = {
  status: {
    draft: '草稿', published: '已发布', normal: '正常', disabled: '已禁用',
    pending: '待处理', processing: '处理中', replied: '已回复', closed: '已关闭',
  },
  template: { 1: '样式一', 2: '样式二', 3: '样式三' },
  statusCode: { 301: '301 永久', 302: '302 临时' },
}

/** 不参与对比的字段：每次写都会变或由系统维护，列出来只是噪声 */
const IGNORED = new Set(['id', 'createdAt', 'updatedAt', 'pwdChangedAt', 'hits', 'lastHitAt', 'lastLoginAt', 'registerIp', 'submitIp'])

/** 只记「已修改」不记取值的字段：哈希与密钥落进审计表等于多一处泄露点 */
const SECRET = new Set(['passwordHash', 'webhookUrl'])
const SECRET_MASK = '******'
/**
 * 个人信息打码：会员、留言人的联系方式落进审计表会绕过会员/反馈的查看权限，
 * 删除也就清不掉这些信息。手机号、邮箱留首尾便于辨认，其余只记长度
 */
function maskPii(field: string, text: string): string {
  if (field === 'phone') {
    // 手机号留前 3 后 4；座机等短号只留后 2，否则 7、8 位号码几乎等于明文
    if (text.length >= 11) return `${text.slice(0, 3)}****${text.slice(-4)}`
    return text.length > 4 ? `****${text.slice(-2)}` : '****'
  }
  if (field === 'email') {
    const at = text.indexOf('@')
    return at > 1 ? `${text[0]}***${text.slice(at)}` : `***${at >= 0 ? text.slice(at) : ''}`
  }
  // 姓名、昵称、单位、职位：留首字便于辨认
  if (NAME_LIKE.has(field)) return text.length > 1 ? `${[...text][0]}**` : '*'
  return `（已隐藏，共 ${text.length} 字）`
}

/** 按「留首字」打码的字段 */
const NAME_LIKE = new Set(['name', 'nickname', 'company', 'position'])

/** 记录名打码：会员、留言人的记录名取自姓名 / 昵称，同样不能落明文 */
const maskedName = (field: string, v: unknown): string | null => (v ? maskPii(field, String(v)) : null)

/** 一类对象：实体、中文名、字段名、取哪个字段作记录名 */
interface TargetDef {
  entity: EntityTarget<ObjectLiteral>
  name: string
  labels: Labels
  title?: (row: ObjectLiteral) => string | null
  /** 个人信息字段，取值打码后再落库 */
  pii?: ReadonlySet<string>
}

const T = {
  admin: { entity: Admin, name: '管理员', labels: ADMIN_LABELS, title: r => `${r.name}（${r.account}）` },
  role: { entity: AdminRole, name: '角色', labels: ROLE_LABELS, title: r => r.name },
  authConfig: { entity: AuthConfig, name: '登录安全配置', labels: AUTH_CONFIG_LABELS },
  channel: { entity: Channel, name: '栏目', labels: CHANNEL_LABELS, title: r => r.name },
  content: { entity: Content, name: '内容', labels: CONTENT_LABELS, title: r => r.title || r.name || null },
  site: { entity: SiteConfig, name: '站点信息', labels: SITE_LABELS },
  feedback: {
    entity: Feedback, name: '反馈', labels: FEEDBACK_LABELS, title: r => maskedName('name', r.name),
    pii: new Set(['name', 'company', 'position', 'phone', 'email', 'content']),
  },
  notify: { entity: NotifyConfig, name: '通知配置', labels: NOTIFY_LABELS },
  member: {
    entity: Member, name: '会员', labels: MEMBER_LABELS, title: r => maskedName('nickname', r.nickname),
    pii: new Set(['nickname', 'phone', 'email', 'avatar']),
  },
  redirect: { entity: RedirectRule, name: '跳转规则', labels: REDIRECT_LABELS, title: r => r.fromPath },
} satisfies Record<string, TargetDef>

/** 定位目标记录 id；可异步（如按历史版本反查内容） */
type Locate = (req: DiffRequest, ds: DataSource) => number[] | Promise<number[]>

interface RouteDef {
  target: TargetDef
  mode: 'update' | 'remove'
  locate: Locate
}

/** 转成正整数 id 列表，过滤非法值 */
function ids(...values: unknown[]): number[] {
  const out: number[] = []
  for (const v of values.flat()) {
    for (const part of typeof v === 'string' ? v.split(',') : [v]) {
      const n = Number(typeof part === 'string' ? part.trim() : part)
      if (Number.isInteger(n) && n > 0) out.push(n)
    }
  }
  return [...new Set(out)]
}

/** 取 body 上的字段 */
const body = (req: DiffRequest, key: string): unknown =>
  req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>)[key] : undefined

const byBody = (key = 'id'): Locate => req => ids(body(req, key))
const byQuery = (key = 'id'): Locate => req => ids(req.query[key])
const byParam: Locate = req => ids(req.params.id)
const singleton: Locate = () => [1]

/**
 * 需要记录改前改后的写接口
 * 键与 op-log-catalog 一致；新增是没有「改前」的，请求参数已能看出建了什么，故不收
 * 新增修改类接口时在此补一行，漏补只是详情里少了对比，不影响日志本身
 */
const ROUTES: Record<string, RouteDef> = {
  'PUT /mgmt/auth/password': { target: T.admin, mode: 'update', locate: req => [req.adminId] },
  'PUT /mgmt/admin/update': { target: T.admin, mode: 'update', locate: byBody() },
  'PUT /mgmt/admin/reset-password': { target: T.admin, mode: 'update', locate: byBody() },
  'DELETE /mgmt/admin/delete': { target: T.admin, mode: 'remove', locate: byQuery() },
  'POST /mgmt/admin/role/save': { target: T.role, mode: 'update', locate: byBody() },
  'DELETE /mgmt/admin/role/delete': { target: T.role, mode: 'remove', locate: byQuery() },

  'PUT /mgmt/auth-config': { target: T.authConfig, mode: 'update', locate: singleton },

  'PUT /mgmt/channel/update': { target: T.channel, mode: 'update', locate: byBody() },
  'DELETE /mgmt/channel/delete': { target: T.channel, mode: 'remove', locate: byQuery() },
  'POST /mgmt/channel/sort': {
    target: T.channel, mode: 'update',
    locate: req => {
      const items = body(req, 'items')
      return Array.isArray(items) ? ids(items.map(i => (i && typeof i === 'object' ? (i as { id?: unknown }).id : null))) : []
    },
  },

  'POST /mgmt/content/save': { target: T.content, mode: 'update', locate: byBody() },
  'DELETE /mgmt/content/delete': { target: T.content, mode: 'remove', locate: byQuery('ids') },
  'PUT /mgmt/content/trash/restore': { target: T.content, mode: 'update', locate: byBody('ids') },
  'DELETE /mgmt/content/trash/purge': { target: T.content, mode: 'remove', locate: byBody('ids') },
  'POST /mgmt/content/revision/restore': {
    target: T.content, mode: 'update',
    locate: async (req, ds) => {
      const [revisionId] = ids(body(req, 'revisionId'))
      if (!revisionId) return []
      const rev = await ds.getRepository(ContentRevision).findOne({ where: { id: revisionId }, select: ['id', 'contentId'] })
      return rev ? [rev.contentId] : []
    },
  },
  'PUT /mgmt/content/top': { target: T.content, mode: 'update', locate: byBody() },
  'PUT /mgmt/content/sort': { target: T.content, mode: 'update', locate: byBody() },
  'PUT /mgmt/content/status': { target: T.content, mode: 'update', locate: byBody('ids') },

  'POST /mgmt/site/save': { target: T.site, mode: 'update', locate: singleton },

  'POST /mgmt/feedback/reply/:id': { target: T.feedback, mode: 'update', locate: byParam },
  'PUT /mgmt/feedback/status/:id': { target: T.feedback, mode: 'update', locate: byParam },
  'DELETE /mgmt/feedback/delete/:id': { target: T.feedback, mode: 'remove', locate: byParam },
  'DELETE /mgmt/feedback/batch': { target: T.feedback, mode: 'remove', locate: byQuery('ids') },
  'PUT /mgmt/feedback/notify-config': { target: T.notify, mode: 'update', locate: singleton },

  'PUT /mgmt/member/status/:id': { target: T.member, mode: 'update', locate: byParam },
  'PUT /mgmt/member/unlock/:id': { target: T.member, mode: 'update', locate: byParam },
  'PUT /mgmt/member/reset-password/:id': { target: T.member, mode: 'update', locate: byParam },
  'DELETE /mgmt/member/delete/:id': { target: T.member, mode: 'remove', locate: byParam },

  'POST /mgmt/redirect/save': { target: T.redirect, mode: 'update', locate: byBody() },
  'DELETE /mgmt/redirect/delete': { target: T.redirect, mode: 'remove', locate: byBody('ids') },
}
/** 一次操作最多对比的记录数；批量操作上限 200 条，全展开详情页读不过来 */
const MAX_RECORDS = 50
/** 单个值的字符数上限：正文动辄上万字，只留开头足以辨认改的是哪段 */
const VALUE_LIMIT = 300
/**
 * 整份对比的字符数上限
 * MySQL text 列 64KB，utf8mb4 中文按 3 字节算，留足余量
 */
const TOTAL_LIMIT = 15000

/** 对比用的快照：记录主键 → 行 */
export type Snapshot = Map<number, ObjectLiteral>

/** 一次待对比的操作：路由定义 + 已定位的 id */
export interface DiffPlan {
  route: RouteDef
  ids: number[]
}

/**
 * 查本次请求是否需要对比，需要则定位目标 id
 * @param key 「方法 + 归一化路径」
 */
export async function planDiff(key: string, req: DiffRequest, ds: DataSource): Promise<DiffPlan | null> {
  const route = ROUTES[key]
  if (!route) return null
  const found = await route.locate(req, ds)
  return found.length ? { route, ids: found } : null
}

/**
 * 读一份快照
 * 带上已软删除的行：恢复、彻底删除操作的对象本就在回收站里
 */
export async function takeSnapshot(plan: DiffPlan, ds: DataSource): Promise<Snapshot> {
  const repo = ds.getRepository(plan.route.target.entity)
  const rows = await repo.find({ where: { id: In(plan.ids.slice(0, MAX_RECORDS)) }, withDeleted: true })
  return new Map(rows.map(r => [Number(r.id), r]))
}

/** 北京时间 YYYY-MM-DD HH:mm:ss；服务器时区不定，显式指定 */
function formatDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return String(d)
  return d.toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false })
}

/**
 * 字段值转展示串；空串与 null 一律视为空，避免「空 → 空」这种无意义的变化
 * @param field 字段名，用于查枚举中文
 */
function display(field: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (value instanceof Date) return formatDate(value)
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  const mapped = VALUE_LABELS[field]?.[text]
  if (mapped) return mapped
  return text.length > VALUE_LIMIT ? `${text.slice(0, VALUE_LIMIT).replace(/[\uD800-\uDBFF]$/, '')}…（共 ${text.length} 字）` : text
}

/** 记录名，取不到时为空 */
function titleOf(def: TargetDef, row: ObjectLiteral): string | null {
  const t = def.title?.(row)
  return t ? String(t).slice(0, 100) : null
}
/** 原值的比较键：日期按时间戳、对象按 JSON，空值归一 */
function rawKey(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return String(value.getTime())
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** 逐字段对比一条记录 */
function diffRow({ labels, pii }: TargetDef, before: ObjectLiteral, after: ObjectLiteral): FieldChange[] {
  const out: FieldChange[] = []
  for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (IGNORED.has(field)) continue
    // 先比原值再转展示串：长正文截断后前缀相同，转完再比会漏掉后半段的修改
    if (rawKey(before[field]) === rawKey(after[field])) continue
    const label = labels[field] ?? field
    if (SECRET.has(field)) {
      out.push({ field, label, before: SECRET_MASK, after: '已修改' })
      continue
    }
    if (pii?.has(field)) {
      const b = rawKey(before[field])
      const a = rawKey(after[field])
      const mb = b === null ? null : maskPii(field, b)
      const ma = a === null ? null : maskPii(field, a)
      // 打码后可能一样（同号段、同长度），仍要让人看出这里改过
      out.push({ field, label, before: mb, after: mb === ma ? '已修改' : ma })
      continue
    }
    let b = display(field, before[field])
    let a = display(field, after[field])
    if (b === a) {
      b = `${b}（差异在 ${VALUE_LIMIT} 字之后）`
      a = `${a}（差异在 ${VALUE_LIMIT} 字之后）`
    }
    out.push({ field, label, before: b, after: a })
  }
  return out
}

/** 删除前的完整内容：只列有值的字段 */
function dumpRow({ labels, pii }: TargetDef, row: ObjectLiteral): FieldChange[] {
  const out: FieldChange[] = []
  for (const [field, value] of Object.entries(row)) {
    if (IGNORED.has(field) || SECRET.has(field)) continue
    const raw = rawKey(value)
    const before = pii?.has(field) ? (raw === null ? null : maskPii(field, raw)) : display(field, value)
    if (before !== null) out.push({ field, label: labels[field] ?? field, before, after: null })
  }
  return out
}

/**
 * 比出改前改后
 * 两边都读不到的记录跳过；没有任何字段变化时返回 null，日志里就不出现对比区
 * @param before 写操作前的快照
 * @param after 写操作后的快照；删除类操作里已删掉的行在这里缺席
 */
export function buildChanges(plan: DiffPlan, before: Snapshot, after: Snapshot): OpLogChanges | null {
  const def = plan.route.target
  const records: RecordChange[] = []
  for (const id of plan.ids.slice(0, MAX_RECORDS)) {
    const b = before.get(id)
    if (!b) continue
    const a = after.get(id)
    // 删除类不论物理删还是软删，都列出删除前的完整内容：只显示「删除时间 空 → 某时刻」看不出删的是什么
    const removed = plan.route.mode === 'remove'
    const fields = removed ? dumpRow(def, b) : diffRow(def, b, a ?? {})
    if (fields.length) records.push({ id, title: titleOf(def, b), mode: plan.route.mode, fields })
  }
  if (!records.length) return null

  const result: OpLogChanges = { target: def.name, records }
  if (plan.ids.length > MAX_RECORDS) result.truncated = true
  // 超长时从末尾逐条丢弃，保住前面的记录完整可读
  while (records.length > 1 && JSON.stringify(result).length > TOTAL_LIMIT) {
    records.pop()
    result.truncated = true
  }
  return result
}

/**
 * 序列化落库；单条记录仍超长时只留字段名，值一律省略
 * @returns 无变化时为 null
 */
export function serializeChanges(changes: OpLogChanges | null): string | null {
  if (!changes) return null
  const text = JSON.stringify(changes)
  if (text.length <= TOTAL_LIMIT) return text
  const slim: OpLogChanges = {
    ...changes,
    truncated: true,
    records: changes.records.map(r => ({ ...r, fields: r.fields.map(f => ({ ...f, before: '(内容过长已省略)', after: '(内容过长已省略)' })) })),
  }
  const slimText = JSON.stringify(slim)
  // 字段多到连名字都放不下时只留对象类型；不能硬截断，截断的 JSON 前端解析不了
  return slimText.length <= TOTAL_LIMIT * 2 ? slimText : JSON.stringify({ target: changes.target, records: [], truncated: true })
}
