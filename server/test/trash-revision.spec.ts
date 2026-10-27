// 内容回收站与历史版本 —— 删了能找回、改错能退回，且回收站里的内容对前台必须不可见
import 'reflect-metadata'
import { DataSource, type Repository } from 'typeorm'
import { Channel } from '../src/modules/cms/channel.entity'
import { Content } from '../src/modules/cms/content.entity'
import { ContentRevision } from '../src/modules/cms/content-revision.entity'
import { ContentService, MAX_REVISIONS_PER_CONTENT, TRASH_RETENTION_DAYS } from '../src/modules/cms/content.service'
import { PortalCmsService } from '../src/modules/cms/portal-cms.service'
import { SearchService } from '../src/modules/cms/search.service'
import { BLOCK_LAYOUT, CHANNEL_TYPE, CONTENT_STATUS } from '../src/common/enums'

let ds: DataSource
let contentRepo: Repository<Content>
let revisionRepo: Repository<ContentRevision>
let service: ContentService
let portal: PortalCmsService
let search: SearchService

beforeAll(async () => {
  ds = new DataSource({
    type: 'better-sqlite3', database: ':memory:',
    entities: [Channel, Content, ContentRevision], synchronize: true, logging: false,
  })
  await ds.initialize()
  contentRepo = ds.getRepository(Content)
  revisionRepo = ds.getRepository(ContentRevision)
  const channelRepo = ds.getRepository(Channel)
  const top = await channelRepo.save(channelRepo.create({ key: 'news', name: '新闻中心', type: CHANNEL_TYPE.GROUP, portalPath: '/news' }))
  await channelRepo.save(channelRepo.create({
    key: 'news-company', name: '公司动态', type: CHANNEL_TYPE.LIST, parentId: top.id, anchor: 'company', layout: BLOCK_LAYOUT.CARDS,
  }))
  service = new ContentService(contentRepo, channelRepo, revisionRepo)
  portal = new PortalCmsService(channelRepo, contentRepo, service)
  search = new SearchService(channelRepo, contentRepo)
})

afterAll(async () => { await ds.destroy() })

beforeEach(async () => {
  await contentRepo.clear()
  await revisionRepo.clear()
})

const make = (title: string) => contentRepo.save(contentRepo.create({
  channelKey: 'news-company', title, content: `<p>${title}正文</p>`, status: CONTENT_STATUS.PUBLISHED,
}))

describe('回收站', () => {
  it('删除后后台列表、前台页面、文章详情、搜索都看不到，回收站里看得到', async () => {
    const c = await make('节能改造')
    await service.remove('news-company', [c.id])

    expect((await service.list({ channelKey: 'news-company' })).total).toBe(0)
    const page = await portal.pageContent('news')
    expect(page.blocks.flatMap(b => b.items).some(i => i.id === c.id)).toBe(false)
    await expect(portal.articleDetail(c.id)).rejects.toThrow('内容不存在')
    expect((await search.search('节能')).total).toBe(0)

    const trash = await service.trashList({ channelKey: 'news-company' })
    expect(trash.list.map(r => r.id)).toEqual([c.id])
  })

  it('恢复后回到列表与前台', async () => {
    const c = await make('恢复我')
    await service.remove('news-company', [c.id])
    expect(await service.restore('news-company', [c.id])).toBe(1)
    expect((await service.list({ channelKey: 'news-company' })).total).toBe(1)
    await expect(portal.articleDetail(c.id)).resolves.toMatchObject({ id: c.id })
  })

  it('彻底删除只认回收站里的：在用内容不能绕过回收站直接抹掉', async () => {
    const live = await make('在用')
    expect(await service.purge('news-company', [live.id])).toBe(0)
    expect(await contentRepo.count()).toBe(1)

    await service.remove('news-company', [live.id])
    expect(await service.purge('news-company', [live.id])).toBe(1)
    expect(await contentRepo.count({ withDeleted: true })).toBe(0)
  })

  it('跨栏目恢复/彻底删除无效', async () => {
    const c = await make('跨栏目')
    await service.remove('news-company', [c.id])
    expect(await service.restore('other', [c.id])).toBe(0)
    expect(await service.purge('other', [c.id])).toBe(0)
  })

  it('超过保留期的自动清理，未超期的保留', async () => {
    const old = await make('老的')
    const fresh = await make('新的')
    await service.remove('news-company', [old.id, fresh.id])
    const later = new Date(Date.now() + (TRASH_RETENTION_DAYS + 1) * 24 * 3600 * 1000)
    // 把 fresh 的删除时间挪到「later 前一天」，模拟只有 old 超期
    await contentRepo.update({ id: fresh.id }, { deletedAt: new Date(later.getTime() - 24 * 3600 * 1000) })
    expect(await service.purgeExpiredTrash(later)).toBe(1)
    const left = await contentRepo.find({ withDeleted: true })
    expect(left.map(r => r.id)).toEqual([fresh.id])
  })
})

describe('历史版本', () => {
  it('更新前记下旧值，恢复后字段回到旧值，且恢复本身也留一版', async () => {
    const c = await make('原标题')
    await service.save({ id: c.id, channelKey: 'news-company', title: '改后标题', content: '<p>新正文</p>' }, '张三')

    const revs = await service.revisions('news-company', c.id)
    expect(revs).toHaveLength(1)
    expect(revs[0]).toMatchObject({ title: '原标题', operator: '张三' })

    const restored = await service.restoreRevision('news-company', revs[0].id, '李四')
    expect(restored).toMatchObject({ title: '原标题', content: '<p>原标题正文</p>' })
    const after = await service.revisions('news-company', c.id)
    expect(after).toHaveLength(2)
    expect(after[0]).toMatchObject({ title: '改后标题', operator: '李四' })
  })

  it('新增不产生版本；超过上限只留最近的', async () => {
    const c = await make('v0')
    expect(await service.revisions('news-company', c.id)).toHaveLength(0)
    for (let i = 1; i <= MAX_REVISIONS_PER_CONTENT + 3; i++) {
      await service.save({ id: c.id, channelKey: 'news-company', title: `v${i}` })
    }
    const revs = await service.revisions('news-company', c.id)
    expect(revs).toHaveLength(MAX_REVISIONS_PER_CONTENT)
    // 最新一版是改成最后一个值之前的那版
    expect(revs[0].title).toBe(`v${MAX_REVISIONS_PER_CONTENT + 2}`)
  })

  it('在回收站里的内容不能恢复版本，提示先恢复内容', async () => {
    const c = await make('a')
    await service.save({ id: c.id, channelKey: 'news-company', title: 'b' })
    const [rev] = await service.revisions('news-company', c.id)
    await service.remove('news-company', [c.id])
    await expect(service.restoreRevision('news-company', rev.id)).rejects.toThrow('回收站')
  })

  it('彻底删除时版本一并清掉', async () => {
    const c = await make('a')
    await service.save({ id: c.id, channelKey: 'news-company', title: 'b' })
    await service.remove('news-company', [c.id])
    await service.purge('news-company', [c.id])
    expect(await revisionRepo.count()).toBe(0)
  })

  it('跨栏目读不到版本', async () => {
    const c = await make('a')
    await service.save({ id: c.id, channelKey: 'news-company', title: 'b' })
    const [rev] = await service.revisions('news-company', c.id)
    await expect(service.revisionDetail('other', rev.id)).rejects.toThrow('历史版本不存在')
  })
})
