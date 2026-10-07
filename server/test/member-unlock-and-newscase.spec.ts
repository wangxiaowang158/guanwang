// 两条按 SRS 修正的口径：
// 1) 会员管理「解除锁定」只清风控锁定，不改变启用/禁用状态（SRS 3.5.14）
// 2) 仪表盘「新闻案例数」只数新闻资讯、项目案例下已发布的内容，不含草稿与分类栏目条目（SRS 3.5.4）
import { DataSource, type Repository } from 'typeorm'
import { Member } from '../src/modules/member/member.entity'
import { MemberService } from '../src/modules/member/member.service'
import { Channel } from '../src/modules/cms/channel.entity'
import { Content } from '../src/modules/cms/content.entity'
import { Feedback } from '../src/modules/feedback/feedback.entity'
import { DashboardService } from '../src/modules/visit/dashboard.service'
import type { VisitService } from '../src/modules/visit/visit.service'
import { CONTENT_STATUS, MEMBER_STATUS, type ContentStatus } from '../src/common/enums'

let ds: DataSource

beforeAll(async () => {
  ds = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [Member, Channel, Content, Feedback],
    synchronize: true,
    logging: false,
  })
  await ds.initialize()
})

afterAll(async () => {
  await ds.destroy()
})

describe('MemberService.unlock', () => {
  let repo: Repository<Member>
  let service: MemberService

  beforeEach(async () => {
    repo = ds.getRepository(Member)
    await repo.clear()
    service = new MemberService(repo)
  })

  it('禁用且被锁定的账号解除锁定后仍保持禁用', async () => {
    const m = await repo.save(repo.create({
      phone: '13800138001', nickname: '甲', passwordHash: 'x',
      status: MEMBER_STATUS.DISABLED, failedAttempts: 5, lockedUntil: new Date(Date.now() + 600_000),
    }))
    await expect(service.unlock(m.id)).resolves.toEqual({ ok: true, data: null })
    const row = await repo.findOneByOrFail({ id: m.id })
    expect(row.status).toBe(MEMBER_STATUS.DISABLED)
    expect(row.lockedUntil).toBeNull()
    expect(row.failedAttempts).toBe(0)
  })

  it('会员不存在时返回失败', async () => {
    await expect(service.unlock(99999)).resolves.toEqual({ ok: false, message: '会员不存在' })
  })
})

describe('DashboardService 新闻案例数', () => {
  it('只计已发布内容，排除草稿与分类栏目条目', async () => {
    const channels = ds.getRepository(Channel)
    const contents = ds.getRepository(Content)
    await contents.clear()
    await channels.clear()

    const base = { type: 'list' as const, formFields: '[]', listColumns: '[]', sort: 0 }
    const news = await channels.save(channels.create({ ...base, key: 'news', name: '新闻资讯', type: 'group' as const, parentId: null }))
    const kase = await channels.save(channels.create({ ...base, key: 'case', name: '项目案例', type: 'group' as const, parentId: null }))
    const company = await channels.save(channels.create({ ...base, key: 'news-company', name: '公司新闻', parentId: news.id }))
    // 三级栏目：后台可在任意栏目下新增子栏目，其已发布内容同样计入
    await channels.save(channels.create({ ...base, key: 'news-company-sub', name: '公司动态', parentId: company.id }))
    await channels.save(channels.create({ ...base, key: 'case-content', name: '案例展示', parentId: kase.id }))
    await channels.save(channels.create({ ...base, key: 'case-industry', name: '行业分类', parentId: kase.id }))
    await channels.save(channels.create({ ...base, key: 'hvac-product', name: '产品中心', parentId: null }))

    const add = (channelKey: string, status: ContentStatus) =>
      contents.save(contents.create({ channelKey, title: channelKey, status, sort: 0, isTop: false }))
    await add('news-company', CONTENT_STATUS.PUBLISHED)
    await add('news-company', CONTENT_STATUS.DRAFT)
    await add('case-content', CONTENT_STATUS.PUBLISHED)
    await add('case-industry', CONTENT_STATUS.PUBLISHED) // 分类条目，不计
    await add('hvac-product', CONTENT_STATUS.PUBLISHED) // 不在统计范围
    await add('news-company-sub', CONTENT_STATUS.PUBLISHED) // 三级栏目，计入

    const visit = { countAll: jest.fn().mockResolvedValue(0), countByDay: jest.fn().mockResolvedValue(0) } as unknown as VisitService
    const svc = new DashboardService(ds.getRepository(Feedback), contents, channels, visit)
    const count = await (svc as unknown as { countNewsCase(): Promise<number> }).countNewsCase()
    expect(count).toBe(3)
  })
})
