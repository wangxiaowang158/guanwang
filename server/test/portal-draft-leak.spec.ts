// 草稿内容不外泄 —— 后台存草稿的前提是「没发布前前台看不到」，这条破了整套内容审核就形同虚设
// 覆盖 PortalCmsService 全部对外出口：菜单、栏目页、续页、文章详情、相邻导航、头图、sitemap
import { DataSource, type Repository } from 'typeorm'
import { Channel } from '../src/modules/cms/channel.entity'
import { Content } from '../src/modules/cms/content.entity'
import { ContentService } from '../src/modules/cms/content.service'
import { PortalCmsService } from '../src/modules/cms/portal-cms.service'
import { BLOCK_LAYOUT, CHANNEL_TYPE, CONTENT_STATUS } from '../src/common/enums'

let ds: DataSource
let channelRepo: Repository<Channel>
let contentRepo: Repository<Content>
let portal: PortalCmsService

/** 已发布内容的 id，按用例内赋值 */
let publishedId: number
/** 草稿内容的 id */
let draftId: number

beforeAll(async () => {
  ds = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [Channel, Content],
    synchronize: true,
    logging: false,
  })
  await ds.initialize()
  channelRepo = ds.getRepository(Channel)
  contentRepo = ds.getRepository(Content)
})

afterAll(async () => {
  await ds.destroy()
})

beforeEach(async () => {
  await contentRepo.clear()
  await channelRepo.clear()

  const contentService = new ContentService(contentRepo, channelRepo)
  portal = new PortalCmsService(channelRepo, contentRepo, contentService)

  // 对外页面 news，下挂一个带锚点的列表子栏目
  const top = await channelRepo.save(
    channelRepo.create({
      key: 'news',
      name: '新闻中心',
      type: CHANNEL_TYPE.GROUP,
      portalPath: '/news',
    }),
  )
  await channelRepo.save(
    channelRepo.create({
      key: 'news-company',
      name: '公司动态',
      type: CHANNEL_TYPE.LIST,
      parentId: top.id,
      anchor: 'company',
      layout: BLOCK_LAYOUT.CARDS,
    }),
  )
  // 页面头图栏目
  await channelRepo.save(
    channelRepo.create({
      key: 'banner-news',
      name: '新闻头图',
      type: CHANNEL_TYPE.LIST,
      parentId: top.id,
    }),
  )

  const published = await contentRepo.save(
    contentRepo.create({
      channelKey: 'news-company',
      title: '已发布文章',
      content: '<p>正文</p>',
      status: CONTENT_STATUS.PUBLISHED,
      sort: 10,
    }),
  )
  publishedId = published.id

  const draft = await contentRepo.save(
    contentRepo.create({
      channelKey: 'news-company',
      title: '草稿文章',
      content: '<p>未审核的正文</p>',
      status: CONTENT_STATUS.DRAFT,
      // sort 比已发布的高：若排序参与筛选前就截断，草稿会挤掉已发布条目
      sort: 99,
      isTop: true,
    }),
  )
  draftId = draft.id
})

describe('栏目页内容', () => {
  it('区块条目里没有草稿', async () => {
    const page = await portal.pageContent('news')
    const ids = page.blocks.flatMap(b => b.items.map(i => i.id))
    expect(ids).toContain(publishedId)
    expect(ids).not.toContain(draftId)
  })

  it('区块 total 只数已发布，否则前台会一直显示「加载更多」却取不到东西', async () => {
    const page = await portal.pageContent('news')
    const block = page.blocks.find(b => b.channelKey === 'news-company')
    expect(block?.total).toBe(1)
  })

  it('草稿标题不出现在响应的任何位置', async () => {
    const page = await portal.pageContent('news')
    expect(JSON.stringify(page)).not.toContain('草稿文章')
    expect(JSON.stringify(page)).not.toContain('未审核的正文')
  })

  it('整栏目全是草稿时不生成区块，不渲染空白段落', async () => {
    await contentRepo.update({ id: publishedId }, { status: CONTENT_STATUS.DRAFT })
    const page = await portal.pageContent('news')
    expect(page.blocks).toHaveLength(0)
  })
})

describe('续页接口', () => {
  it('续页条目里没有草稿，total 也只数已发布', async () => {
    const res = await portal.blockItems('news-company', 1, 10)
    expect(res.total).toBe(1)
    expect(res.items.map(i => i.id)).toEqual([publishedId])
  })

  it('翻到第二页时不会把草稿补上来凑数', async () => {
    const res = await portal.blockItems('news-company', 2, 10)
    expect(res.items).toHaveLength(0)
  })
})

describe('文章详情', () => {
  it('已发布内容可访问', async () => {
    const detail = await portal.articleDetail(publishedId)
    expect(detail.id).toBe(publishedId)
  })

  it('草稿按 404 处理，不泄露「该 id 存在但未发布」', async () => {
    await expect(portal.articleDetail(draftId)).rejects.toThrow('内容不存在')
  })

  it('草稿不出现在相邻文章导航里', async () => {
    const detail = await portal.articleDetail(publishedId)
    expect(detail.prev).toBeNull()
    expect(detail.next).toBeNull()
  })
})

describe('菜单与头图', () => {
  it('只有草稿的子栏目不出菜单项', async () => {
    await contentRepo.update({ id: publishedId }, { status: CONTENT_STATUS.DRAFT })
    const menu = await portal.menu()
    const news = menu.find(m => m.key === 'news')
    expect(news?.children).toBeUndefined()
  })

  it('有已发布内容的子栏目才出菜单项', async () => {
    const menu = await portal.menu()
    const news = menu.find(m => m.key === 'news')
    expect(news?.children?.map(c => c.key)).toEqual(['news-company'])
  })

  it('草稿状态的头图不生效', async () => {
    await contentRepo.save(
      contentRepo.create({
        channelKey: 'banner-news',
        title: '草稿头图',
        cover: '/uploads/draft-banner.jpg',
        status: CONTENT_STATUS.DRAFT,
      }),
    )
    expect(await portal.bannerImage('news')).toBeUndefined()
  })

  it('已发布头图正常生效', async () => {
    await contentRepo.save(
      contentRepo.create({
        channelKey: 'banner-news',
        title: '正式头图',
        cover: '/uploads/banner.jpg',
        status: CONTENT_STATUS.PUBLISHED,
      }),
    )
    expect(await portal.bannerImage('news')).toBe('/uploads/banner.jpg')
  })
})

describe('sitemap', () => {
  it('草稿详情页不进 sitemap，否则爬虫会撞 404', async () => {
    const entries = await portal.sitemapEntries()
    const paths = entries.map(e => e.path)
    expect(paths).toContain(`/article/${publishedId}`)
    expect(paths).not.toContain(`/article/${draftId}`)
  })

  it('栏目页地址仍照常收录（空栏目页也是可访问地址）', async () => {
    const paths = (await portal.sitemapEntries()).map(e => e.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/news')
  })
})
