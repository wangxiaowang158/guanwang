// 留言按线索类型筛选 —— 预约测算/演示是最该优先跟进的线索，筛错了就会漏跟进
// 列表与导出共用同一套筛选，两边都要验：导出口径与列表不一致，运营拿到的表格就是错的
import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { DataSource, type Repository } from 'typeorm'
import { Feedback } from '../src/modules/feedback/feedback.entity'
import { FeedbackReply } from '../src/modules/feedback/feedback-reply.entity'
import { Member } from '../src/modules/member/member.entity'
import { FeedbackService } from '../src/modules/feedback/feedback.service'
import { FeedbackQueryDto } from '../src/modules/feedback/dto/feedback.dto'
import { FEEDBACK_SOURCE, FEEDBACK_STATUS, LEAD_TYPE } from '../src/common/enums'

let ds: DataSource
let repo: Repository<Feedback>
let service: FeedbackService

beforeAll(async () => {
  ds = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [Feedback, FeedbackReply, Member],
    synchronize: true,
    logging: false,
  })
  await ds.initialize()
  repo = ds.getRepository(Feedback)
  // 通知服务在列表/导出路径上不会被调用
  service = new FeedbackService(repo, ds.getRepository(FeedbackReply), ds.getRepository(Member), {} as never)

  const base = { source: FEEDBACK_SOURCE.ANONYMOUS, status: FEEDBACK_STATUS.PENDING, content: '内容', phone: '13800000000' }
  await repo.save([
    repo.create({ ...base, name: '测算A', leadType: LEAD_TYPE.ENERGY_ASSESS }),
    repo.create({ ...base, name: '测算B', leadType: LEAD_TYPE.ENERGY_ASSESS }),
    repo.create({ ...base, name: '演示', leadType: LEAD_TYPE.PRODUCT_DEMO }),
    repo.create({ ...base, name: '普通', leadType: null }),
  ])
})

afterAll(async () => {
  await ds.destroy()
})

/** 列表里的姓名，按字典序 */
const namesOf = async (query: Partial<FeedbackQueryDto>) =>
  (await service.list(query as FeedbackQueryDto)).list.map(i => i.name).sort()

describe('线索类型筛选', () => {
  it('按具体线索类型精确筛', async () => {
    expect(await namesOf({ leadType: LEAD_TYPE.ENERGY_ASSESS })).toEqual(['测算A', '测算B'])
    expect(await namesOf({ leadType: LEAD_TYPE.PRODUCT_DEMO })).toEqual(['演示'])
  })

  it('none 只筛出未带线索类型的普通留言', async () => {
    expect(await namesOf({ leadType: 'none' })).toEqual(['普通'])
  })

  it('不传则不过滤', async () => {
    expect(await namesOf({})).toHaveLength(4)
  })

  it('导出与列表同口径', async () => {
    const rows = await service.listForExport({ leadType: LEAD_TYPE.ENERGY_ASSESS } as FeedbackQueryDto)
    expect(rows.map(r => r.name).sort()).toEqual(['测算A', '测算B'])
  })

  it('非法线索类型在 DTO 层被拒', () => {
    const errs = validateSync(plainToInstance(FeedbackQueryDto, { leadType: 'hack' }))
    expect(errs.map(e => e.property)).toEqual(['leadType'])
  })
})
