// 操作日志改前改后对比 —— 拦截器在写操作前后各读一次目标记录，逐字段比出差异
import type { CallHandler, ExecutionContext } from '@nestjs/common'
import { lastValueFrom, of } from 'rxjs'
import type { DataSource } from 'typeorm'
import { OpLogInterceptor } from '../src/modules/op-log/op-log.interceptor'
import type { OpLogService } from '../src/modules/op-log/op-log.service'
import type { OpLogChanges } from '../src/modules/op-log/op-log-diff'

/** 假数据源：find 依次返回改前、改后两份快照 */
function fakeDs(...snapshots: Array<Record<string, unknown>[]>): DataSource {
  const find = jest.fn()
  for (const s of snapshots) find.mockResolvedValueOnce(s)
  return { getRepository: () => ({ find, findOne: jest.fn() }) } as unknown as DataSource
}

function ctxOf(method: string, path: string, extra: { body?: unknown; query?: unknown; params?: unknown } = {}): ExecutionContext {
  const req = {
    method, path, ip: '127.0.0.1',
    body: extra.body ?? {}, query: extra.query ?? {}, params: extra.params ?? {},
    admin: { id: 1, account: 'admin', name: '管理员', isSuper: true, perms: [] },
  }
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
  } as unknown as ExecutionContext
}

const ok: CallHandler = { handle: () => of({ code: 200, message: 'ok', data: null }) }

/** 跑一次拦截器，返回写入的 changes（已解析） */
async function run(ctx: ExecutionContext, ds: DataSource, next: CallHandler = ok) {
  const write = jest.fn().mockResolvedValue(undefined)
  await lastValueFrom(new OpLogInterceptor({ write } as unknown as OpLogService, ds).intercept(ctx, next))
  // 写日志不 await，等微任务跑完
  await new Promise(r => setImmediate(r))
  expect(write).toHaveBeenCalledTimes(1)
  const input = write.mock.calls[0][0] as { changes: string | null; result: string }
  return { input, changes: input.changes ? (JSON.parse(input.changes) as OpLogChanges) : null }
}

describe('操作日志改前改后对比', () => {
  it('修改栏目：只列出真正变化的字段，带中文名', async () => {
    const before = { id: 24, name: '产品类别', hidden: false, sort: 3, updatedAt: new Date(1) }
    const after = { id: 24, name: '产品类别TEST', hidden: false, sort: 3, updatedAt: new Date(2) }
    const { changes } = await run(ctxOf('PUT', '/api/mgmt/channel/update', { body: { id: 24, name: '产品类别TEST' } }), fakeDs([before], [after]))
    expect(changes?.target).toBe('栏目')
    expect(changes?.records).toEqual([{
      id: 24, title: '产品类别', mode: 'update',
      fields: [{ field: 'name', label: '栏目名称', before: '产品类别', after: '产品类别TEST' }],
    }])
  })

  it('布尔与枚举值转成中文', async () => {
    const { changes } = await run(
      ctxOf('PUT', '/api/mgmt/content/status', { body: { channelKey: 'news', ids: [5], status: 'published' } }),
      fakeDs([{ id: 5, title: '新闻', status: 'draft', isTop: false }], [{ id: 5, title: '新闻', status: 'published', isTop: true }]),
    )
    expect(changes?.records[0].fields).toEqual([
      { field: 'status', label: '状态', before: '草稿', after: '已发布' },
      { field: 'isTop', label: '置顶', before: '否', after: '是' },
    ])
  })

  it('密码哈希只记「已修改」，不落取值', async () => {
    const { changes } = await run(
      ctxOf('PUT', '/api/mgmt/admin/reset-password', { body: { id: 2, password: 'x' } }),
      fakeDs([{ id: 2, account: 'a', name: 'A', passwordHash: 'h1' }], [{ id: 2, account: 'a', name: 'A', passwordHash: 'h2' }]),
    )
    expect(JSON.stringify(changes)).not.toMatch(/h1|h2/)
    expect(changes?.records[0].fields).toEqual([{ field: 'passwordHash', label: '密码', before: '******', after: '已修改' }])
  })

  it('删除：列出删除前的内容', async () => {
    const { changes } = await run(
      ctxOf('DELETE', '/api/mgmt/feedback/delete/7', { params: { id: '7' } }),
      fakeDs([{ id: 7, name: '张三', content: '咨询', company: '' }], []),
    )
    expect(changes?.records[0]).toMatchObject({ id: 7, mode: 'remove', title: '张**' })
    expect(changes?.records[0].fields.map(f => f.label)).toEqual(['姓名', '反馈内容'])
  })

  it('删除会员与反馈：手机号、邮箱、留言内容打码，不落原值', async () => {
    const member = await run(
      ctxOf('DELETE', '/api/mgmt/member/delete/3', { params: { id: '3' } }),
      fakeDs([{ id: 3, nickname: '小王', phone: '13812345678', email: 'wang@example.com', avatar: '/uploads/a.png' }], []),
    )
    const text = JSON.stringify(member.changes)
    expect(text).not.toMatch(/13812345678|wang@example\.com|a\.png/)
    expect(member.changes?.records[0].fields).toEqual(expect.arrayContaining([
      { field: 'phone', label: '手机号', before: '138****5678', after: null },
      { field: 'email', label: '邮箱', before: 'w***@example.com', after: null },
    ]))

    expect(member.changes?.records[0].title).toBe('小**')

    const fb = await run(
      ctxOf('DELETE', '/api/mgmt/feedback/delete/7', { params: { id: '7' } }),
      fakeDs([{ id: 7, name: '张三丰', company: '某某医院', position: '后勤主任', phone: '6512345', content: '想了解节能改造' }], []),
    )
    expect(JSON.stringify(fb.changes)).not.toMatch(/张三丰|某某医院|后勤主任|6512345|节能改造/)
    expect(fb.changes?.records[0].fields).toContainEqual({ field: 'phone', label: '电话', before: '****45', after: null })
  })

  it('修改个人信息字段：打码后相同也标出已修改', async () => {
    const { changes } = await run(
      ctxOf('PUT', '/api/mgmt/member/status/3', { params: { id: '3' } }),
      fakeDs([{ id: 3, nickname: '小王', phone: '13812345678' }], [{ id: 3, nickname: '小王', phone: '13800005678' }]),
    )
    expect(changes?.records[0].fields).toEqual([{ field: 'phone', label: '手机号', before: '138****5678', after: '已修改' }])
  })

  it('请求参数里的机器人地址脱敏', async () => {
    const { input } = await run(
      ctxOf('PUT', '/api/mgmt/feedback/notify-config', { body: { type: 'dingtalk', webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=SECRET123' } }),
      fakeDs([], []),
    )
    expect(JSON.stringify(input)).not.toMatch(/SECRET123/)
  })

  it('长正文只在 300 字之后有差异时也能识别', async () => {
    const head = '字'.repeat(400)
    const { changes } = await run(
      ctxOf('POST', '/api/mgmt/content/save', { body: { id: 3, channelKey: 'news' } }),
      fakeDs([{ id: 3, content: `${head}A` }], [{ id: 3, content: `${head}B` }]),
    )
    expect(changes?.records[0].fields[0].before).toContain('差异在 300 字之后')
  })

  it('内容没变化时不记对比', async () => {
    const row = { id: 1, webTitle: '官网' }
    const { changes } = await run(ctxOf('POST', '/api/mgmt/site/save', { body: { webTitle: '官网' } }), fakeDs([row], [{ ...row }]))
    expect(changes).toBeNull()
  })

  it('业务失败不读改后快照、不记对比', async () => {
    const ds = fakeDs([{ id: 24, name: '旧' }])
    const fail: CallHandler = { handle: () => of({ code: 400, message: '名称重复', data: null }) }
    const { input } = await run(ctxOf('PUT', '/api/mgmt/channel/update', { body: { id: 24 } }), ds, fail)
    expect(input).toMatchObject({ result: 'failure', changes: null })
  })

  it('读快照出错不影响业务与日志', async () => {
    const ds = { getRepository: () => ({ find: jest.fn().mockRejectedValue(new Error('db down')) }) } as unknown as DataSource
    const { input } = await run(ctxOf('PUT', '/api/mgmt/channel/update', { body: { id: 24 } }), ds)
    expect(input).toMatchObject({ result: 'success', changes: null })
  })
})
