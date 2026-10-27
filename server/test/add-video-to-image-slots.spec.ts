// 迁移 AddVideoToImageSlots：只给有封面的图片位栏目在 cover 后插入 video，其余原样
import type { QueryRunner } from 'typeorm'
import { AddVideoToImageSlots1790000016000 } from '../src/migrations/1790000016000-AddVideoToImageSlots'

type Row = { id: number; channelKey: string; layout: string | null; formFields: string | null }

/** 内存版 QueryRunner：SELECT 返回给定行，UPDATE 记下写入值 */
function fakeRunner(rows: Row[], type: 'mysql' | 'sqlite' = 'mysql') {
  const updates = new Map<number, string[]>()
  const runner = {
    connection: { options: { type } },
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.startsWith('SELECT')) return rows
      const [fields, id] = params as [string, number]
      updates.set(id, JSON.parse(fields) as string[])
      return []
    }),
  }
  return { runner: runner as unknown as QueryRunner, updates, query: runner.query }
}

describe('AddVideoToImageSlots1790000016000', () => {
  const run = async (rows: Row[], type?: 'mysql' | 'sqlite') => {
    const f = fakeRunner(rows, type)
    await new AddVideoToImageSlots1790000016000().up(f.runner)
    return f
  }

  it('图片位区块与首页板块：video 插在 cover 后面', async () => {
    const { updates } = await run([
      { id: 1, channelKey: 'be-value', layout: 'tiles', formFields: '["title","description","cover","link","isTop"]' },
      { id: 2, channelKey: 'home-view', layout: null, formFields: '["title","description","cover","link","isTop"]' },
    ])
    expect(updates.get(1)).toEqual(['title', 'description', 'cover', 'video', 'link', 'isTop'])
    expect(updates.get(2)).toEqual(['title', 'description', 'cover', 'video', 'link', 'isTop'])
  })

  it('已有 video、没有 cover、非图片位形态、表单损坏的栏目都不改', async () => {
    const { updates } = await run([
      { id: 1, channelKey: 'a', layout: 'cards', formFields: '["title","cover","video"]' },
      { id: 2, channelKey: 'b', layout: 'brand', formFields: '["title","content"]' },
      { id: 3, channelKey: 'c', layout: 'rich', formFields: '["title","cover"]' },
      { id: 4, channelKey: 'home-intro', layout: null, formFields: '["title","cover"]' },
      { id: 5, channelKey: 'd', layout: 'tiles', formFields: 'not json' },
    ])
    expect(updates.size).toBe(0)
  })

  it('按方言转义 key 列', async () => {
    const mysql = await run([], 'mysql')
    expect(mysql.query.mock.calls[0][0]).toContain('`key`')
    const sqlite = await run([], 'sqlite')
    expect(sqlite.query.mock.calls[0][0]).toContain('"key"')
  })
})
