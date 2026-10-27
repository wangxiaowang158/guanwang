// 第三版官网内容种子 —— 文案逐字取自《网站框架图第三版 09.21》，图片取自框架图裁出的素材
// 框架图里只有标题、内容留空的区块不生成内容（前台空区块自动不显示），由市场部在后台补录
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ContentRow } from './content-rows'
import { V3_PAGES } from './channel-rows-v3'
import { seedAssetUrl, type SeedManifest } from './seed-assets'

/** 栏目 key → 素材清单里的页面代号 */
const PAGE_CODES: Record<string, string> = {
  'business-energy': 'be', 'business-building': 'bb', 'business-living': 'bl',
  'es-overview': 'es-overview', 'es-consult': 'es-consult', 'es-design': 'es-design',
  'es-build': 'es-build', 'es-operate': 'es-operate', 'es-inspect': 'es-inspect',
  'es-maintain': 'es-maintain', 'es-room': 'es-room',
  'bs-overview': 'bs-overview', 'bs-platform': 'bs-platform', 'bs-twin': 'bs-twin',
  'bs-turing': 'bs-turing', 'bs-safety': 'bs-safety',
  'ls-overview': 'ls-overview', 'ls-room': 'ls-room', 'ls-livex': 'ls-livex',
}

/** 无素材时的文字内容：[标题, 说明, 正文(可选)] */
type TextItem = [string, string, string?]

/**
 * 文字内容：框架图上能逐字读出的文案。key 为区块栏目 key
 * 有素材的区块以素材为主（标题说明取素材清单），这里的文字只在该区块没有素材时使用；
 * 品牌、案例这类卡片区块无论有无素材都用这里的文字（素材只补配图）
 */
const TEXTS: Record<string, TextItem[]> = {
  'business-energy-trend': [
    ['市场重心：增量 → 存量', '综合能源运营服务行业发展趋势之一'],
    ['需求性质：从省钱到考核', '综合能源运营服务行业发展趋势之二'],
    ['模式升级：单点改造 → 全过程智慧能源管理', '综合能源运营服务行业发展趋势之三'],
  ],
  'business-energy-solution': [
    ['打造能源智能体', '提供一站式智慧能源数智化解决方案；能源智能体从设计阶段就给能源系统注入 AI 基因，设计意图 100% 传递到运行端'],
  ],
  'business-energy-dotr': [
    ['DOTR 能效达成率 = 实际运行能效 ÷ 设计预期能效 × 100%', '行业平均 60-70%（设计意图严重流失）；优秀项目 75-80%（有较好的运维团队）；中瑞恒目标 ≥90%（设计意图 100% 传递 + AI 持续优化）'],
  ],
  'business-energy-brand': [
    ['千牛卫', '核心技术品牌', '<p><strong>以技为刃，守卫能源</strong></p><p>使命：以科技创新守卫能源安全。</p>'],
    ['小马哥', '核心服务品牌', '<p><strong>极寒无畏，温暖必达</strong></p><p>使命：做最值得信赖的能源运营伙伴。</p>'],
  ],
  'business-energy-value': [
    ['运营驱动设计', '投前目标 = 运营结果'],
    ['设计能效 = 运行能效', '设计意图完整传递到运行端'],
  ],
  'business-energy-cases': [
    ['中新置地', ''], ['太阳宫', ''], ['雄安新区', ''],
    ['平安金融大厦', ''], ['居然之家', ''], ['中交世通大厦', ''],
  ],
  'business-building-solution': [
    ['中瑞恒建筑生命体', '躯体 iBuilder · 神经元 iRoc · 心血管 iHees · 免疫 iSMS · 大脑 iBESS · 四肢 图灵BOX'],
  ],
  'business-building-value': [
    ['高效节能', ''], ['安全可靠', ''], ['降本增效', ''],
    ['舒适体验', ''], ['绿色低碳', ''], ['数据驱动', ''],
  ],
  'business-living-solution': [
    ['中瑞恒未来人居', '以科技赋能空间，以系统守护生命；构建建筑能源智能体 + 建筑生命体，为人创造健康、舒适、安全、智慧的工作与生活环境'],
  ],
  'business-living-brand': [
    ['小鹿爱家', '私人订制未来人居环境', '<p>小鹿爱家，私人订制未来人居环境。</p>'],
  ],
  'business-living-value': [
    ['健康舒适', '清新空气 宜人温湿'], ['温暖舒适', '智能地暖 恒温舒适'],
    ['安全可靠', '结构稳固 风险预警'], ['智能中枢', '数据联动 智慧掌控'],
  ],
  'es-overview-solution': [
    ['中瑞恒能源智能体', '统一闭环 · 跨阶段协同 · 数据驱动价值：咨询、设计、建造、运行、巡检、检修 6 个智能体，感知 → 诊断 → 规划 → 决策 → 执行 → 验证 → 学习'],
  ],
  'ls-overview-solution': [
    ['中瑞恒未来人居', '能源智能中枢 + 建筑生命体；应用场景：高端住宅、臻享办公、系统集成交付、自研 LiveX 未来人居环境管理系统'],
  ],
  'ls-overview-value': [
    ['健康舒适', '清新空气 宜人温湿'], ['温暖舒适', '智能地暖 恒温舒适'],
    ['安全可靠', '结构稳固 风险预警'], ['智能中枢', '数据联动 智慧掌控'],
  ],
}

/** 卡片类区块：文字为主、素材按序号补配图 */
const TEXT_FIRST_LAYOUTS = new Set(['brand', 'cards'])

/** 同步读取素材清单（内容行组装是同步流程）；读不到按空清单处理，内容照常写入只是不带图 */
function readManifest(): SeedManifest {
  try {
    const raw = readFileSync(join(process.cwd(), 'seed-assets', 'v3', 'manifest.json'), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as SeedManifest) : {}
  } catch {
    return {}
  }
}

/** 同一栏目内按数组顺序生成降序 sort（后台列表 sort 大者靠前） */
function withSort(channelKey: string, items: Omit<ContentRow, 'channelKey' | 'sort'>[]): ContentRow[] {
  return items.map((it, i) => ({ ...it, channelKey, sort: items.length - i }))
}

/**
 * 单个区块的内容行
 * - 卡片类（品牌、案例）：以文字为准，素材按序号补配图
 * - 其余（图片展示、磁贴）：有素材用素材（标题说明取清单），没有素材才用文字
 */
function blockRows(channelKey: string, layout: string, assets: SeedManifest[string][string] | undefined): ContentRow[] {
  const texts = TEXTS[channelKey] ?? []
  const imgs = assets ?? []
  if (TEXT_FIRST_LAYOUTS.has(layout) && texts.length) {
    return withSort(channelKey, texts.map(([title, desc, html], i) => ({
      title,
      description: desc || null,
      subtitle: layout === 'brand' ? desc || null : null,
      content: html ?? null,
      cover: imgs[i] ? seedAssetUrl(imgs[i].file) : null,
    })))
  }
  if (imgs.length) {
    return withSort(channelKey, imgs.map(a => ({
      title: a.title || null,
      description: a.desc || null,
      cover: seedAssetUrl(a.file),
    })))
  }
  return withSort(channelKey, texts.map(([title, desc, html]) => ({
    title, description: desc || null, content: html ?? null,
  })))
}

/** 首页核心优势：框架图只给了四个名称，说明由市场部在后台补录 */
function advantageRows(): ContentRow[] {
  return withSort('home-advantage', ['方案定制', '前卫设计', '精工品质', '完美配套'].map(title => ({ title })))
}

/** 第三版全部内容行：逐页逐区块按素材与文字生成 */
export function buildV3ContentRows(): ContentRow[] {
  const manifest = readManifest()
  const out: ContentRow[] = [...advantageRows()]
  for (const page of V3_PAGES) {
    const code = PAGE_CODES[page.key]
    for (const [anchor, , layout] of page.blocks ?? []) {
      const assets = code ? manifest[code]?.[anchor] : undefined
      out.push(...blockRows(`${page.key}-${anchor}`, layout, assets))
    }
  }
  return out
}
