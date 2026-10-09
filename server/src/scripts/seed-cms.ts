// CMS 种子数据 —— 把原 admin / web 两套 mock 的内容一次性写入数据库
// 用法：npx ts-node src/scripts/seed-cms.ts [--if-empty]
//       容器内：node dist/scripts/seed-cms.js --if-empty（镜像启动时已自动执行）
// 幂等：栏目按 key 判重（存在则补齐前台字段），内容按栏目判重（该栏目已有内容则整栏跳过）
import 'reflect-metadata'
import { config } from 'dotenv'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import { CONTENT_STATUS } from '../common/enums'
import { serializeExtra } from '../common/content-extra'
import { buildChannelRows } from './seed/channel-rows'
import { V2_OVERRIDES, isLegacyKey } from './seed/channel-rows-v2'
import { buildContentRows } from './seed/content-rows'
import siteJson from '../modules/cms/seed/site.json'
import webSiteJson from '../modules/cms/seed/web-site.json'
import { say } from './report'

config()

/** 写入栏目树。父子关系按 key 解析，故先写顶级再写子级 */
async function seedChannels(ds: DataSource): Promise<{ inserted: number; updated: number }> {
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

  for (const row of ordered) {
    const parentId = row.parentKey ? idByKey.get(row.parentKey) ?? null : null
    if (row.parentKey && parentId === null) {
      throw new Error(`栏目 ${row.key} 的父栏目 ${row.parentKey} 未找到，种子数据有误`)
    }

    const existing = await repo.findOne({ where: { key: row.key } })
    const entity = existing ?? repo.create({ key: row.key })
    // 已存在的栏目只补齐前台呈现字段，不覆盖后台可能已改过的名称与排序
    if (!existing) {
      entity.name = row.name
      entity.type = row.type as typeof entity.type
      entity.parentId = parentId
      entity.sort = row.sort
      entity.icon = row.icon
      entity.formFields = JSON.stringify(row.formFields)
      entity.listColumns = JSON.stringify(row.listColumns)
      entity.seoTitle = row.seoTitle
      entity.seoKeywords = row.seoKeywords
      entity.seoDescription = row.seoDescription
    }
    // 菜单字段与 portalPath 同属种子维护；hidden 只在新建时写，已存在的栏目保留后台设置
    // menuParent 由种子独占；menuGroup / menuDesc 后台可编辑，只在库里为空时补，不覆盖运营改过的值
    entity.menuParent = row.menuParent ?? null
    entity.menuGroup = entity.menuGroup ?? row.menuGroup ?? null
    entity.menuDesc = entity.menuDesc ?? row.menuDesc ?? null
    if (!existing && row.hidden !== undefined) entity.hidden = row.hidden
    entity.portalPath = row.portalPath
    entity.anchor = row.anchor
    entity.subheading = row.subheading
    entity.layout = row.layout as typeof entity.layout
    entity.heroEyebrow = row.heroEyebrow
    entity.heroTitle = row.heroTitle
    entity.heroDesc = row.heroDesc

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
async function seedContents(ds: DataSource): Promise<{ inserted: number; skipped: number }> {
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
async function seedSiteConfig(ds: DataSource): Promise<'inserted' | 'skipped'> {
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
      const { Channel } = await import('../modules/cms/channel.entity')
      if (await ds.getRepository(Channel).exists({ where: { key: SEED_MARKER_KEY } })) {
        say('官网栏目已初始化，跳过 CMS 种子写入')
        return
      }
    }

    say('写入栏目树…')
    const ch = await seedChannels(ds)
    say(`  栏目：新增 ${ch.inserted} 个，补齐 ${ch.updated} 个`)

    say('写入站点信息…')
    const site = await seedSiteConfig(ds)
    say(`  站点信息：${site === 'inserted' ? '已写入' : '已存在，跳过'}`)

    say('写入内容…')
    const ct = await seedContents(ds)
    say(`  内容：新增 ${ct.inserted} 条，跳过 ${ct.skipped} 条`)

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
