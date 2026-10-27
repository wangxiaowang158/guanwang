// CMS 种子数据 —— 把原 admin / web 两套 mock 的内容一次性写入数据库
// 用法：npx ts-node src/scripts/seed-cms.ts [--if-empty]
//       容器内：node dist/scripts/seed-cms.js --if-empty（镜像启动时已自动执行）
// 幂等：栏目按 key 判重（存在则补齐前台字段），内容按栏目判重（该栏目已有内容则整栏跳过）
import 'reflect-metadata'
import { config } from 'dotenv'
import { NestFactory } from '@nestjs/core'
import { DataSource, type EntityManager } from 'typeorm'
import { CONTENT_STATUS } from '../common/enums'
import { serializeExtra } from '../common/content-extra'
import { buildChannelRows } from './seed/channel-rows'
import { In } from 'typeorm'
import { V2_OVERRIDES, isLegacyKey } from './seed/channel-rows-v2'
import { V3_MARKER_KEY, V3_RETIRED_KEYS, V3_SORTS, buildV3Rows } from './seed/channel-rows-v3'
import { copySeedAssets } from './seed/seed-assets'
import { buildContentRows } from './seed/content-rows'
import siteJson from '../modules/cms/seed/site.json'
import webSiteJson from '../modules/cms/seed/web-site.json'
import { say } from './report'

config()

/** 写入栏目树。父子关系按 key 解析，故先写顶级再写子级 */
async function seedChannels(ds: EntityManager): Promise<{ inserted: number; updated: number }> {
  const { Channel } = await import('../modules/cms/channel.entity')
  const repo = ds.getRepository(Channel)
  const rows = buildChannelRows()
  // 顶级在前，保证子行能查到父 id
  const ordered = [...rows].sort((a, b) => Number(!!a.parentKey) - Number(!!b.parentKey))

  const idByKey = new Map<string, number>()
  let inserted = 0
  let updated = 0
  // 新版栏目首次入库的那一次，才套用保留栏目的新导航顺序；
  // 之后重跑种子不再动，免得覆盖运营在后台调过的排序
  const upgradingToV2 = !(await repo.findOne({ where: { key: 'business' } }))
  // 第三版首次入库：业务三页等既有栏目要按框架图第三版整体改写一次（名称、排序、版式、表单字段）
  const upgradingToV3 = !(await repo.findOne({ where: { key: V3_MARKER_KEY } }))
  const v3Keys = new Set(buildV3Rows().map(r => r.key))

  for (const row of ordered) {
    const parentId = row.parentKey ? idByKey.get(row.parentKey) ?? null : null
    if (row.parentKey && parentId === null) {
      throw new Error(`栏目 ${row.key} 的父栏目 ${row.parentKey} 未找到，种子数据有误`)
    }

    const existing = await repo.findOne({ where: { key: row.key } })
    const entity = existing ?? repo.create({ key: row.key })
    // 已存在的栏目只补齐前台呈现字段，不覆盖后台可能已改过的名称与排序；
    // 第三版升级那一次例外：第三版接管的栏目按新结构整体改写
    const rewrite = !existing || (upgradingToV3 && v3Keys.has(row.key))
    if (rewrite) {
      entity.name = row.name
      entity.type = row.type as typeof entity.type
      entity.parentId = parentId
      entity.sort = row.sort
      entity.icon = row.icon
      entity.formFields = JSON.stringify(row.formFields)
      entity.listColumns = JSON.stringify(row.listColumns)
      // SEO 是运营录入的，升级改写也不清掉已有值
      entity.seoTitle = entity.seoTitle ?? row.seoTitle
      entity.seoKeywords = entity.seoKeywords ?? row.seoKeywords
      entity.seoDescription = entity.seoDescription ?? row.seoDescription
    }
    // 第三版起页面路径、挂靠、锚点、版式、头图文案都可在后台改：只在新建、升级改写，
    // 或从第一版直升（库里还没有 v2 的「主营业务」）时写入；平时重跑种子不再覆盖运营的配置
    // （hidden 同理，只在新建时写）
    if (rewrite || upgradingToV2) {
      entity.menuParent = row.menuParent ?? null
      entity.menuGroup = row.menuGroup ?? null
      entity.menuDesc = row.menuDesc ?? null
      entity.portalPath = row.portalPath
      entity.externalUrl = entity.externalUrl ?? row.externalUrl ?? null
      entity.anchor = row.anchor
      entity.subheading = row.subheading
      entity.layout = row.layout as typeof entity.layout
      entity.heroEyebrow = row.heroEyebrow
      entity.heroTitle = row.heroTitle
      entity.heroDesc = row.heroDesc
    }
    if (!existing && row.hidden !== undefined) entity.hidden = row.hidden

    const saved = await repo.save(entity)
    idByKey.set(saved.key, saved.id)
    if (existing) updated += 1
    else inserted += 1
  }

  if (upgradingToV2) {
    // 保留栏目套用新导航顺序（只在新版栏目首次入库那一次，之后不覆盖运营在后台调的排序）
    for (const [key, o] of Object.entries(V2_OVERRIDES)) {
      if (o.sort !== undefined) await repo.update({ key }, { sort: o.sort })
    }
  }

  if (upgradingToV3) {
    // 第三版：首页 / 联盟 / 关于套用新导航顺序；改版下线的页面与区块隐藏（栏目与内容保留，可恢复）
    for (const [key, sort] of Object.entries(V3_SORTS)) await repo.update({ key }, { sort })
    const retired = await repo.find({ where: { key: In(V3_RETIRED_KEYS) } })
    for (const c of retired) await repo.update({ id: c.id }, { hidden: true })
    if (retired.length) say(`  第三版已下线：${retired.map(c => c.name).join('、')}`)
  }

  // 旧库里改版前的页面（暖通 / 综合能源 / 智慧能源 / 智能家居）：种子不再生成它们，
  // 但库里的老行仍带着前台路径，会留在导航里并指向已下线的路由（点进去 404）。
  // 这里隐藏并清掉路径，只改这两列，栏目与内容都保留，要彻底删除请在后台「栏目管理」操作。
  // 判定看"是否还带前台路径"而不是"是否首次升级"：中途失败重跑能补上，
  // 清掉路径后也不会再匹配，运营之后手动重新显示的不会被每次种子重新隐藏
  const stale = (await repo.find()).filter(c => isLegacyKey(c.key) && c.portalPath)
  for (const c of stale) await repo.update({ id: c.id }, { hidden: true, portalPath: null })
  if (stale.length) say(`  已下线旧页面：${stale.map(c => c.key).join('、')}`)

  return { inserted, updated }
}

/** 写入内容。已有内容的栏目整栏跳过，避免重复执行产生副本 */
async function seedContents(ds: EntityManager): Promise<{ inserted: number; skipped: number }> {
  const { Channel } = await import('../modules/cms/channel.entity')
  const { Content } = await import('../modules/cms/content.entity')
  const channelRepo = ds.getRepository(Channel)
  const repo = ds.getRepository(Content)

  const rows = buildContentRows()
  const existingKeys = new Set(
    (await repo.createQueryBuilder('c').select('DISTINCT c.channelKey', 'k').getRawMany<{ k: string }>())
      .map(r => r.k),
  )
  const knownChannels = new Set((await channelRepo.find()).map(c => c.key))

  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    if (existingKeys.has(row.channelKey)) {
      skipped += 1
      continue
    }
    if (!knownChannels.has(row.channelKey)) {
      say(`  ⚠️ 栏目 ${row.channelKey} 不存在，该条内容跳过`)
      skipped += 1
      continue
    }
    // 显式标记已发布：种子内容就是为了让前台开箱有东西可看，不能落成草稿
    const { extra, ...rest } = row
    await repo.save(repo.create({ ...rest, extra: serializeExtra(extra), status: CONTENT_STATUS.PUBLISHED }))
    inserted += 1
  }

  return { inserted, skipped }
}

/** 写入站点信息。已有非空标题时视为后台已维护过，不覆盖 */
async function seedSiteConfig(ds: EntityManager): Promise<'inserted' | 'skipped'> {
  const { SiteConfig } = await import('../modules/cms/site-config.entity')
  const repo = ds.getRepository(SiteConfig)
  const existing = await repo.findOne({ where: { id: 1 } })
  if (existing?.webTitle) return 'skipped'

  const web = webSiteJson.siteInfo
  // 两份 mock 各有独占字段：admin 有 logo / mapLink，web 有 slogan。
  // 备案号以 site.json 为准（原先塞在 copyright 里，已拆成独立字段），缺失时回落 web-site.json
  await repo.save(repo.create({
    id: 1,
    webTitle: siteJson.webTitle,
    keywords: siteJson.keywords,
    description: siteJson.description,
    slogan: web.slogan,
    subSlogan: web.subSlogan,
    phone: siteJson.phone,
    website: siteJson.website,
    recruitEmail: siteJson.recruitEmail,
    contactEmail: siteJson.contactEmail,
    address: siteJson.address,
    mapLng: siteJson.mapLng,
    mapLat: siteJson.mapLat,
    mapLink: siteJson.mapLink,
    copyright: siteJson.copyright,
    icpCode: siteJson.icpCode || web.icpCode,
    policeCode: siteJson.policeCode || web.policeCode,
    logo: siteJson.logo,
    footerLogo: siteJson.footerLogo,
    wechatQr: siteJson.wechatQr,
    template: siteJson.template,
    heroImage: siteJson.heroImage || web.heroImage || null,
    heroVideo: siteJson.heroVideo || null,
  }))
  return 'inserted'
}

/**
 * --if-empty：仅当栏目表为空（全新库）时才写入，供容器启动时自动执行。
 * 不带此参数时，已有栏目的前台呈现字段（路径、锚点、头图文案等）会被种子值覆盖，
 * 每次启动都跑就会冲掉后台改过的配置，故自动执行必须带它
 */
const IF_EMPTY = process.argv.includes('--if-empty')

/**
 * 「关于我们」下缺招聘职位区块时补建
 * @returns 是否新建了
 */
async function ensureJobsBlock(m: EntityManager): Promise<boolean> {
  const { Channel } = await import('../modules/cms/channel.entity')
  const repo = m.getRepository(Channel)
  if (await repo.exists({ where: { key: 'about-jobs' } })) return false
  const about = await repo.findOne({ where: { key: 'about' } })
  if (!about) return false
  const { insertJobsBlock } = await import('../migrations/1790000023000-AddJobsBlock')
  // 走 EntityManager.query：仍在外层种子事务内，失败随整批回滚
  await insertJobsBlock((sql, params) => m.query(sql, params), m.connection.options.type === 'mysql', about.id)
  return true
}

/** 判断是否已初始化的标志栏目：种子栏目树的根，首页一级页面 */
const SEED_MARKER_KEY = 'home'

async function main(): Promise<void> {
  const { AppModule } = await import('../app.module')
  // 保留 warn/error：启动上下文会触发 AdminModule 建首个超管，
  // 容器首启时本脚本先于主进程运行，随机初始口令只会在这里打出那一次
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] })
  const ds = app.get(DataSource)

  try {
    if (IF_EMPTY) {
      // 以「官网首页」栏目是否存在判断是否已初始化，不能用栏目总数：
      // 迁移 AddOpLogChannel 在全新库上也会插入操作日志栏目，跑完迁移栏目表就不再为空
      // 已初始化、且已升级到第三版才跳过：已上线的旧库在新镜像首启时自动完成一次第三版升级。
      // 升级会把第三版接管的栏目（主营业务及三个业务页、其区块、首页战略合作）的名称、排序、
      // 版式、表单字段、菜单与头图文案重置为第三版结构（SEO 与外链保留）；隐藏下线栏目；给空栏目补内容。
      // 其余栏目与全部已有内容不动
      const { Channel } = await import('../modules/cms/channel.entity')
      const channelRepo = ds.getRepository(Channel)
      const initialized = await channelRepo.exists({ where: { key: SEED_MARKER_KEY } })
      const onV3 = await channelRepo.exists({ where: { key: V3_MARKER_KEY } })
      if (initialized && onV3) {
        say('官网栏目已初始化，跳过 CMS 种子写入')
        return
      }
    }

    // 素材复制在事务之前：同名文件跳过、可重复执行；内容里引用的图先就位
    say('复制种子素材…')
    say(`  素材：${await copySeedAssets()} 个文件`)

    // 栏目、站点信息、内容同一事务：第三版的判定栏目（energy-solutions）随事务一起提交，
    // 中途任何一步失败都整体回滚，重跑时仍判定为「未升级」，不会停在半升级状态
    await ds.transaction(async (m) => {
      say('写入栏目树…')
      const ch = await seedChannels(m)
      say(`  栏目：新增 ${ch.inserted} 个，补齐 ${ch.updated} 个`)

      say('写入站点信息…')
      const site = await seedSiteConfig(m)
      say(`  站点信息：${site === 'inserted' ? '已写入' : '已存在，跳过'}`)

      say('写入内容…')
      const ct = await seedContents(m)
      say(`  内容：新增 ${ct.inserted} 条，跳过 ${ct.skipped} 条`)

      // 全新库上迁移先于种子运行，那时「关于我们」还不存在，招聘职位区块的迁移无处可挂，在此补上
      if (await ensureJobsBlock(m)) say('  已补建「关于我们 → 招聘职位」区块')
    })

    say('CMS 种子数据写入完成')
  } finally {
    await app.close()
  }
}

main().catch((err: unknown) => {
  const reason = err instanceof Error ? err.stack ?? err.message : String(err)
  process.stderr.write(`CMS 种子数据写入失败：${reason}\n`)
  process.exit(1)
})
