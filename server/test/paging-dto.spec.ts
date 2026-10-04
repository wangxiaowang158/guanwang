// 分页入参 DTO 校验 —— 走的是 ValidationPipe 内部同一条流程（plainToInstance + validateSync）
// 为什么值得单测：query 取到的全是字符串，`?page=abc` 经转换得 NaN，
// 而 NaN 进 TypeORM 的 skip() 会抛 TypeORMError 直接打 500。这道校验是唯一的拦截点。
// 所有带分页的后台/前台入口都列在这里，新增分页接口时补进 PAGING_DTOS 即可
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { LogQueryDto } from '../src/modules/login-log/mgmt-login-log.controller'
import { OpLogQueryDto } from '../src/modules/op-log/mgmt-op-log.controller'
import { AdminListQueryDto } from '../src/modules/admin/dto/admin.dto'
import { ContentListQueryDto } from '../src/modules/cms/dto/content.dto'
import { BlockItemsQueryDto } from '../src/modules/cms/dto/portal.dto'
import { MemberQueryDto } from '../src/modules/member/dto/member-manage.dto'
import { FeedbackQueryDto } from '../src/modules/feedback/dto/feedback.dto'

/** 与 main.ts 全局 ValidationPipe 一致的转换选项 */
const TRANSFORM_OPTIONS = { enableImplicitConversion: false }

/** 待校验的 DTO 清单：名称 + 构造器 + 该 DTO 的必填字段 */
const PAGING_DTOS: Array<{
  name: string
  // 各 DTO 结构不同，此处只关心能否实例化与校验，故用宽泛构造器类型
  dto: new () => object
  required: Record<string, unknown>
}> = [
  { name: '登录日志', dto: LogQueryDto, required: {} },
  { name: '操作日志', dto: OpLogQueryDto, required: {} },
  { name: '管理员列表', dto: AdminListQueryDto, required: {} },
  { name: '后台内容列表', dto: ContentListQueryDto, required: { channelKey: 'news-company' } },
  { name: '前台区块续页', dto: BlockItemsQueryDto, required: { channelKey: 'news-company' } },
  { name: '会员列表', dto: MemberQueryDto, required: {} },
  { name: '反馈列表', dto: FeedbackQueryDto, required: {} },
]

/**
 * 按 ValidationPipe 的流程校验一组 query 参数
 * @param dto DTO 构造器
 * @param query 原始 query（值一律按字符串给，模拟真实 HTTP 请求）
 */
function validate(dto: new () => object, query: Record<string, unknown>) {
  const instance = plainToInstance(dto, query, TRANSFORM_OPTIONS)
  return validateSync(instance as object, { whitelist: true })
}

/** 取出报错涉及的字段名 */
function errorFields(errors: ReturnType<typeof validate>): string[] {
  return errors.map(e => e.property)
}

describe.each(PAGING_DTOS)('$name 的分页入参', ({ dto, required }) => {
  it('正常页码通过', () => {
    expect(validate(dto, { ...required, page: '2', pageSize: '20' })).toHaveLength(0)
  })

  it('不传分页参数通过（由 service 取默认值）', () => {
    expect(validate(dto, { ...required })).toHaveLength(0)
  })

  it('page=abc 被拒 —— 这是打 500 的那条路径', () => {
    expect(errorFields(validate(dto, { ...required, page: 'abc' }))).toContain('page')
  })

  it('pageSize=abc 被拒', () => {
    expect(errorFields(validate(dto, { ...required, pageSize: 'abc' }))).toContain('pageSize')
  })

  it('page=0 被拒', () => {
    expect(errorFields(validate(dto, { ...required, page: '0' }))).toContain('page')
  })

  it('page 为负数被拒', () => {
    expect(errorFields(validate(dto, { ...required, page: '-5' }))).toContain('page')
  })

  it('page 为小数被拒', () => {
    expect(errorFields(validate(dto, { ...required, page: '1.5' }))).toContain('page')
  })

  it('page 为空字符串被拒，不静默当成第 1 页', () => {
    expect(errorFields(validate(dto, { ...required, page: '' }))).toContain('page')
  })

  it('通过校验后 page 已是 number，不是字符串', () => {
    const instance = plainToInstance(dto, { ...required, page: '3' }, TRANSFORM_OPTIONS) as {
      page?: unknown
    }
    expect(typeof instance.page).toBe('number')
    expect(instance.page).toBe(3)
  })
})

describe('前台区块续页的栏目 key', () => {
  it('缺 channelKey 被拒 —— 否则会去查 undefined 栏目', () => {
    expect(errorFields(validate(BlockItemsQueryDto, { page: '1' }))).toContain('channelKey')
  })

  it('空 channelKey 被拒', () => {
    expect(errorFields(validate(BlockItemsQueryDto, { channelKey: '' }))).toContain('channelKey')
  })

  it('超长 channelKey 被拒，长度上限与栏目表字段一致', () => {
    const errors = validate(BlockItemsQueryDto, { channelKey: 'x'.repeat(65) })
    expect(errorFields(errors)).toContain('channelKey')
  })

  it('64 字符的 channelKey 恰好通过', () => {
    expect(validate(BlockItemsQueryDto, { channelKey: 'x'.repeat(64) })).toHaveLength(0)
  })
})
