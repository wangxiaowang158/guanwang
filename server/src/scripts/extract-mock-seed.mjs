// 一次性数据迁移脚本 —— 把 admin/web 两端 mock 里的现有内容抽成 JSON 种子
//
// 为什么要有这个脚本：CMS 落库后前台展示内容必须与 mock 阶段完全一致，
// 而栏目树有 60+ 节点、栏目页内容近 400 行，手抄必然出错。
// 直接 import mock 模块取其真实数据，转成 JSON 供 seed-cms.ts 读取。
//
// 用法：node src/scripts/extract-mock-seed.mjs
// 产物：src/modules/cms/seed/*.json
// 迁移完成后本脚本与 mock 文件一并删除即可。
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../../..')
const ADMIN_MOCK = resolve(REPO, 'admin/mock')
const WEB_MOCK = resolve(REPO, 'web/src/mock')
const ESBUILD = resolve(REPO, 'admin/node_modules/.bin/esbuild')
const OUT_DIR = resolve(HERE, '../modules/cms/seed')

/**
 * 转译并 import 一个 web 端 .ts mock 模块
 * web 的 mock 是 TS，Node 无法直接 import，用 admin 包里的 esbuild 转成 mjs 后加载。
 * 这些文件是纯数据导出、互不 import，故可独立转译。
 */
async function importTs(tmpDir, fileName) {
  const out = resolve(tmpDir, fileName.replace(/\.ts$/, '.mjs'))
  execFileSync(ESBUILD, [
    resolve(WEB_MOCK, fileName),
    '--format=esm',
    '--platform=node',
    `--outfile=${out}`,
  ])
  return import(`file://${out}`)
}

/** 写 JSON，统一两空格缩进 */
function writeJson(name, data) {
  writeFileSync(resolve(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n', 'utf8')
  const count = Array.isArray(data) ? data.length : Object.keys(data).length
  console.log(`  ${name}  ${count} 项`)
}

/** 从 mock 的路由定义中找出某条并执行其 response，取回数据段 */
function callMock(routes, url, method, ctx = {}) {
  const route = routes.find((r) => r.url === url && r.method === method)
  if (!route) throw new Error(`未找到 mock 路由：${method.toUpperCase()} ${url}`)
  const res = route.response(ctx)
  return res.data
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  console.log('抽取 admin 端 mock：')

  // 栏目树：模块直接导出了内部数组
  const channelMod = await import(`file://${ADMIN_MOCK}/channel.js`)
  const channels = channelMod.__getChannels()
  writeJson('channels.json', channels)

  // 站点基本信息：单例，调 detail 路由取回
  const siteMod = await import(`file://${ADMIN_MOCK}/site.js`)
  const site = callMock(siteMod.default, '/api/site/detail', 'get')
  writeJson('site.json', site)

  // 内容：store 未导出，按栏目 key 逐个调 list 路由取回
  const contentMod = await import(`file://${ADMIN_MOCK}/content.js`)
  const contents = []
  for (const ch of channels) {
    const rows = callMock(contentMod.default, '/api/content/list', 'get', {
      query: { channelKey: ch.key },
    })
    if (Array.isArray(rows) && rows.length > 0) contents.push(...rows)
  }
  writeJson('contents.json', contents)

  // ---------- web 端 ----------
  console.log('\n抽取 web 端 mock：')
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'zrh-mock-'))
  try {
    const { pageContents } = await importTs(tmpDir, 'pageData.ts')
    writeJson('page-contents.json', pageContents)

    const section = await importTs(tmpDir, 'sectionData.ts')
    writeJson('home-sections.json', {
      business: section.businessList,
      products: section.productList,
      services: section.serviceList,
      partners: section.partnerList,
      achievements: section.achievementList,
      social: section.socialList,
    })

    const siteData = await importTs(tmpDir, 'siteData.ts')
    writeJson('web-site.json', {
      siteInfo: siteData.siteInfo,
      about: siteData.aboutSection,
      philosophy: siteData.philosophySection,
    })

    const { seoConfigs } = await importTs(tmpDir, 'seoData.ts')
    writeJson('seo.json', seoConfigs)

    const { menuTree } = await importTs(tmpDir, 'menu.ts')
    writeJson('menu.json', menuTree)

    const bg = await importTs(tmpDir, 'backgrounds.ts')
    writeJson('backgrounds.json', {
      home: bg.homeBackgrounds,
      pageHero: bg.pageHeroBackgrounds,
    })
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }

  console.log('\n完成。产物目录：src/modules/cms/seed/')
}

main().catch((err) => {
  console.error('抽取失败：', err)
  process.exit(1)
})
