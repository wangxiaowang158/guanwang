// CMS 前台数据一致性校验 —— 比对「库里装配出的结果」与「原 web mock」是否等价
// 用法：npx ts-node src/scripts/verify-cms-parity.ts（需先跑 seed:cms）
// 目的：切掉 mock 之前先确认前台看到的东西没变，而不是切完再肉眼找差异
import 'reflect-metadata'
import { config } from 'dotenv'
import { NestFactory } from '@nestjs/core'
import menuJson from '../modules/cms/seed/menu.json'
import pageJson from '../modules/cms/seed/page-contents.json'
import seoJson from '../modules/cms/seed/seo.json'

config()

let passed = 0
let failed = 0

/** 断言并记录 */
function check(name: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    passed += 1
    console.info(`  ✅ ${name}`)
  } else {
    failed += 1
    console.error(`  ❌ ${name}`, detail !== undefined ? JSON.stringify(detail) : '')
  }
}

/**
 * 已登记的预期差异：这三页原 mock 里有区块但后台无对应子栏目，内容完全无法编辑
 * 补上子栏目后前台导航相应多出可跳转子项，属有意变化，不计为失败
 */
const EXPECTED_NEW_ANCHORS: Record<string, string[]> = {
  household: ['feature'],
  alliance: ['partner', 'join'],
  about: ['profile', 'honor', 'social'],
}

/** 菜单：key / label / path / 子项锚点应与原 mock 一致 */
function verifyMenu(actual: { key: string; label: string; path: string; children?: { key: string; anchor?: string }[] }[]): void {
  const expectKeys = menuJson.map(m => m.key)
  check('菜单顶级项数量与顺序一致', JSON.stringify(actual.map(m => m.key)) === JSON.stringify(expectKeys), {
    expect: expectKeys, actual: actual.map(m => m.key),
  })

  for (const expect of menuJson) {
    const got = actual.find(m => m.key === expect.key)
    if (!got) {
      check(`菜单项 ${expect.key} 存在`, false)
      continue
    }
    check(`菜单项 ${expect.key} 名称与路径一致`, got.label === expect.label && got.path === expect.path, {
      expect: { label: expect.label, path: expect.path }, actual: { label: got.label, path: got.path },
    })
    const expectChildren = ('children' in expect ? expect.children : undefined) ?? []
    const gotChildren = got.children ?? []
    const expectAnchors = [
      ...expectChildren.map(c => c.anchor),
      ...(EXPECTED_NEW_ANCHORS[expect.key] ?? []),
    ]
    const suffix = EXPECTED_NEW_ANCHORS[expect.key] ? '（含已登记的新增子项）' : ''
    check(
      `菜单项 ${expect.key} 子项锚点一致${suffix}`,
      JSON.stringify(gotChildren.map(c => c.anchor)) === JSON.stringify(expectAnchors),
      { expect: expectAnchors, actual: gotChildren.map(c => c.anchor) },
    )
  }
}

/** 栏目页：区块锚点、展示形态、条目标题集合应与原 mock 一致 */
function verifyPages(get: (key: string) => Promise<{
  hero: { eyebrow: string; title: string }
  blocks: { anchor: string; layout: string; heading: string; items: { title: string }[] }[]
}>): Promise<void[]> {
  const pages = pageJson as Record<string, {
    hero: { eyebrow: string; title: string }
    blocks: { anchor: string; layout: string; heading: string; items: { title: string }[] }[]
  }>

  return Promise.all(Object.entries(pages).map(async ([key, expect]) => {
    const got = await get(key)
    check(`${key} Hero 文案一致`,
      got.hero.eyebrow === expect.hero.eyebrow && got.hero.title === expect.hero.title,
      { expect: expect.hero, actual: got.hero })

    check(`${key} 区块锚点与顺序一致`,
      JSON.stringify(got.blocks.map(b => b.anchor)) === JSON.stringify(expect.blocks.map(b => b.anchor)),
      { expect: expect.blocks.map(b => b.anchor), actual: got.blocks.map(b => b.anchor) })

    for (const eb of expect.blocks) {
      const gb = got.blocks.find(b => b.anchor === eb.anchor)
      if (!gb) continue
      check(`${key}#${eb.anchor} 展示形态与标题一致`,
        gb.layout === eb.layout && gb.heading === eb.heading,
        { expect: { layout: eb.layout, heading: eb.heading }, actual: { layout: gb.layout, heading: gb.heading } })
      // 条目按标题集合比对：顺序在「统一为后台同序」时已知会变，故只比集合
      const expectTitles = [...eb.items.map(i => i.title)].sort()
      const gotTitles = [...gb.items.map(i => i.title)].sort()
      check(`${key}#${eb.anchor} 条目集合一致（${eb.items.length} 条）`,
        JSON.stringify(gotTitles) === JSON.stringify(expectTitles),
        { missing: expectTitles.filter(t => !gotTitles.includes(t)) })
    }
  }))
}

async function main(): Promise<void> {
  const { AppModule } = await import('../app.module')
  const { PortalCmsService } = await import('../modules/cms/portal-cms.service')
  const { HomeSectionService } = await import('../modules/cms/home-section.service')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  const portal = app.get(PortalCmsService)
  const home = app.get(HomeSectionService)

  console.info('校验导航菜单…')
  verifyMenu(await portal.menu())

  console.info('校验栏目页内容…')
  await verifyPages(key => portal.pageContent(key))

  console.info('校验栏目 SEO…')
  const seo = await portal.seoConfigs()
  for (const [key, expect] of Object.entries(seoJson)) {
    const got = seo[key]
    check(`${key} SEO 一致`,
      !!got && got.title === expect.title && got.keywords === expect.keywords && got.description === expect.description,
      { expect, actual: got })
  }

  console.info('校验首页板块…')
  const sections = await home.sections()
  const counts: Record<string, number> = {
    business: 4, products: 3, services: 4, partners: 6, achievements: 4, social: 3,
  }
  for (const [name, expectLen] of Object.entries(counts)) {
    const list = sections[name]
    check(`首页 ${name} 共 ${expectLen} 条`, Array.isArray(list) && list.length === expectLen, {
      actual: Array.isArray(list) ? list.length : typeof list,
    })
  }
  const about = sections.about as { title: string; content: string }
  check('首页公司简介有内容', !!about?.title && !!about?.content, about)
  check('首页 Hero 背景图已装配', !!(sections.backgrounds as Record<string, string>)?.hero)

  await app.close()
  console.info(`\n校验结束：通过 ${passed} 项，失败 ${failed} 项`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('校验执行失败：', err)
  process.exit(1)
})
