// CMS 种子数据 —— 把原 admin / web 两套 mock 的内容一次性写入数据库
// 用法：npx ts-node src/scripts/seed-cms.ts
// 幂等：栏目按 key 判重（存在则补齐前台字段），内容按栏目判重（该栏目已有内容则整栏跳过）
import 'reflect-metadata'
import { config } from 'dotenv'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import { buildChannelRows } from './seed/channel-rows'
import { buildContentRows } from './seed/content-rows'
import siteJson from '../modules/cms/seed/site.json'
import webSiteJson from '../modules/cms/seed/web-site.json'

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
      console.warn(`  ⚠️ 栏目 ${row.channelKey} 不存在，该条内容跳过`)
      skipped += 1
      continue
    }
    await repo.save(repo.create(row))
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
  // 两份 mock 各有独占字段：admin 有 logo / mapLink，web 有 slogan / 备案号
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
    icpCode: web.icpCode,
    policeCode: web.policeCode,
    logo: siteJson.logo,
    footerLogo: siteJson.footerLogo,
    wechatQr: siteJson.wechatQr,
    template: siteJson.template,
    heroImage: siteJson.heroImage || web.heroImage || null,
    heroVideo: siteJson.heroVideo || null,
  }))
  return 'inserted'
}

async function main(): Promise<void> {
  const { AppModule } = await import('../app.module')
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  const ds = app.get(DataSource)

  console.info('写入栏目树…')
  const ch = await seedChannels(ds)
  console.info(`  栏目：新增 ${ch.inserted} 个，补齐 ${ch.updated} 个`)

  console.info('写入站点信息…')
  const site = await seedSiteConfig(ds)
  console.info(`  站点信息：${site === 'inserted' ? '已写入' : '已存在，跳过'}`)

  console.info('写入内容…')
  const ct = await seedContents(ds)
  console.info(`  内容：新增 ${ct.inserted} 条，跳过 ${ct.skipped} 条`)

  await app.close()
  console.info('CMS 种子数据写入完成')
}

main().catch((err) => {
  console.error('CMS 种子数据写入失败：', err)
  process.exit(1)
})
