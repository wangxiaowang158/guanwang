// 站点扩展配置净化、灰色模式判定、站长验证 head、留言防刷、搜索
import 'reflect-metadata'
import { DataSource, type Repository } from 'typeorm'
import { isGrayActive, normalizeSiteExt, toPublicSiteExt } from '../src/common/site-ext'
import { renderExtHead } from '../src/modules/cms/prerender-head.builder'
import { checkFormSubmission, FORM_TOKEN_TTL_MS, issueFormToken } from '../src/modules/feedback/form-guard'
import { Channel } from '../src/modules/cms/channel.entity'
import { Content } from '../src/modules/cms/content.entity'
import { SearchService, snippetOf } from '../src/modules/cms/search.service'
import { BLOCK_LAYOUT, CHANNEL_TYPE, CONTENT_STATUS } from '../src/common/enums'

describe('normalizeSiteExt', () => {
  it('非法值丢弃、缺省给默认', () => {
    const cfg = normalizeSiteExt({
      baiduTongji: '<script>', gaId: 'UA-123', verify: { baidu: 'code"><script>', google: 'abc_DEF-123' },
      grayMode: { enabled: 'yes', start: '2026-04-04', end: '2026-04-01' },
      floatBar: { kefuUrl: 'javascript:alert(1)' }, watermark: { position: 'top', enabled: true },
      evil: 1,
    })
    expect(cfg.baiduTongji).toBeUndefined()
    expect(cfg.gaId).toBeUndefined()
    expect(cfg.verify).toEqual({ google: 'abc_DEF-123' })
    // 首尾颠倒视作未设区间
    expect(cfg.grayMode).toEqual({ enabled: false })
    expect(cfg.floatBar).toEqual({ enabled: true, showPhone: true, showWechat: true })
    expect(cfg.watermark).toEqual({ enabled: true, position: 'bottom-right', webp: false })
    expect(cfg).not.toHaveProperty('evil')
  })

  it('合法值保留；JSON 文本与坏 JSON 都能处理', () => {
    const cfg = normalizeSiteExt(JSON.stringify({
      baiduTongji: 'A'.repeat(32), gaId: 'G-ABC123', grayMode: { enabled: false, start: '2026-04-04', end: '2026-04-04' },
      floatBar: { enabled: false, kefuUrl: 'https://kefu.example.com/chat?id=1' },
    }))
    expect(cfg.baiduTongji).toBe('a'.repeat(32))
    expect(cfg.gaId).toBe('G-ABC123')
    expect(cfg.grayMode).toEqual({ enabled: false, start: '2026-04-04', end: '2026-04-04' })
    expect(cfg.floatBar.kefuUrl).toBe('https://kefu.example.com/chat?id=1')
    expect(normalizeSiteExt('{broken')).toEqual(normalizeSiteExt(null))
  })

  it('不存在的日期被拒', () => {
    expect(normalizeSiteExt({ grayMode: { start: '2026-02-31', end: '2026-03-01' } }).grayMode.start).toBeUndefined()
  })

  it('公开配置不含水印与验证码', () => {
    const pub = toPublicSiteExt(normalizeSiteExt({ verify: { baidu: 'abcd1234' }, watermark: { enabled: true } }))
    expect(pub).not.toHaveProperty('watermark')
    expect(pub).not.toHaveProperty('verify')
  })
})

describe('灰色模式', () => {
  it('手动开关优先；区间按东八区自然日含首尾', () => {
    expect(isGrayActive({ enabled: true })).toBe(true)
    const cfg = { enabled: false, start: '2026-04-04', end: '2026-04-04' }
    // UTC 4 月 3 日 16:30 = 北京 4 月 4 日 00:30
    expect(isGrayActive(cfg, new Date('2026-04-03T16:30:00Z'))).toBe(true)
    expect(isGrayActive(cfg, new Date('2026-04-03T15:30:00Z'))).toBe(false)
    expect(isGrayActive(cfg, new Date('2026-04-04T15:59:00Z'))).toBe(true)
    expect(isGrayActive(cfg, new Date('2026-04-04T16:01:00Z'))).toBe(false)
  })

  it('head 片段：生效时带灰色样式，验证 meta 按配置输出', () => {
    const head = renderExtHead(normalizeSiteExt({ grayMode: { enabled: true }, verify: { baidu: 'codeAbc123' } })).join('')
    expect(head).toContain('<meta name="baidu-site-verification" content="codeAbc123">')
    expect(head).toContain('grayscale(100%)')
    expect(renderExtHead(normalizeSiteExt(null))).toEqual([])
  })
})

describe('留言防刷', () => {
  const now = Date.now()
  const aged = issueFormToken(now - 10_000)

  it('正常提交放行', () => {
    expect(checkFormSubmission({ formToken: aged, content: '咨询方案' }, now)).toEqual({ pass: true })
  })

  it('蜜罐与秒填静默丢弃', () => {
    expect(checkFormSubmission({ honeypot: 'x', formToken: aged, content: 'a' }, now)).toMatchObject({ pass: false, silent: true })
    expect(checkFormSubmission({ formToken: issueFormToken(now - 500), content: 'a' }, now)).toMatchObject({ pass: false, silent: true })
  })

  it('缺令牌、伪造、过期、链接过多：明确提示', () => {
    expect(checkFormSubmission({ content: 'a' }, now)).toMatchObject({ pass: false, silent: false })
    const forged = `${aged.slice(0, -2)}xx`
    expect(checkFormSubmission({ formToken: forged, content: 'a' }, now)).toMatchObject({ pass: false, silent: false })
    const old = issueFormToken(now - FORM_TOKEN_TTL_MS - 1000)
    expect(checkFormSubmission({ formToken: old, content: 'a' }, now)).toMatchObject({ pass: false, silent: false })
    expect(checkFormSubmission({ formToken: aged, content: 'http://a http://b www.c' }, now))
      .toMatchObject({ pass: false, silent: false, message: expect.stringContaining('链接') })
  })
})

describe('站内搜索', () => {
  let ds: DataSource
  let contentRepo: Repository<Content>
  let search: SearchService

  beforeAll(async () => {
    ds = new DataSource({ type: 'better-sqlite3', database: ':memory:', entities: [Channel, Content], synchronize: true, logging: false })
    await ds.initialize()
    const channelRepo = ds.getRepository(Channel)
    contentRepo = ds.getRepository(Content)
    const news = await channelRepo.save(channelRepo.create({ key: 'news', name: '新闻中心', type: CHANNEL_TYPE.GROUP, portalPath: '/news' }))
    await channelRepo.save(channelRepo.create({ key: 'news-company', name: '公司动态', type: CHANNEL_TYPE.LIST, parentId: news.id, anchor: 'company', layout: BLOCK_LAYOUT.CARDS }))
    await channelRepo.save(channelRepo.create({ key: 'banner-news', name: '新闻头图', type: CHANNEL_TYPE.LIST, parentId: news.id }))
    const home = await channelRepo.save(channelRepo.create({ key: 'home', name: '首页', type: CHANNEL_TYPE.GROUP, portalPath: '/' }))
    await channelRepo.save(channelRepo.create({ key: 'home-intro', name: '简介', type: CHANNEL_TYPE.SINGLE, parentId: home.id, anchor: 'intro' }))
    const hidden = await channelRepo.save(channelRepo.create({ key: 'secret', name: '隐藏页', type: CHANNEL_TYPE.GROUP, portalPath: '/secret', hidden: true }))
    await channelRepo.save(channelRepo.create({ key: 'secret-a', name: '隐藏块', type: CHANNEL_TYPE.LIST, parentId: hidden.id, anchor: 'a' }))

    const add = (channelKey: string, title: string, extra: Partial<Content> = {}) =>
      contentRepo.save(contentRepo.create({ channelKey, title, status: CONTENT_STATUS.PUBLISHED, ...extra }))
    await add('news-company', '锅炉节能改造完工', { content: '<p>正文</p>' })
    await add('news-company', '年度总结', { description: '全年完成多个节能项目' })
    await add('news-company', '节能草稿', { status: CONTENT_STATUS.DRAFT })
    await add('banner-news', '节能头图')
    await add('home-intro', '节能简介')
    await add('secret-a', '节能隐藏')
    await add('news-company', '折扣 100% 返现')
    search = new SearchService(channelRepo, contentRepo)
  })

  afterAll(async () => { await ds.destroy() })

  it('只搜前台可达的已发布内容；标题命中排前；有正文进详情，否则落锚点', async () => {
    const res = await search.search('节能')
    expect(res.list.map(h => h.title)).toEqual(['锅炉节能改造完工', '年度总结'])
    expect(res.list[0].path).toMatch(/^\/article\/\d+$/)
    expect(res.list[1].path).toBe('/news#company')
    expect(res.list[1].pageName).toBe('新闻中心')
  })

  it('通配符按字面匹配；空关键词返回空', async () => {
    expect((await search.search('100%')).list.map(h => h.title)).toEqual(['折扣 100% 返现'])
    expect((await search.search('0_')).total).toBe(0)
    expect((await search.search('   ')).total).toBe(0)
  })

  it('摘要截取命中处附近', () => {
    const text = `${'甲'.repeat(100)}关键词${'乙'.repeat(100)}`
    const s = snippetOf(text, '关键词')
    expect(s).toContain('关键词')
    expect(s.startsWith('…')).toBe(true)
    expect(s.endsWith('…')).toBe(true)
  })
})
