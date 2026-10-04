// 迁移完备性校验 —— 比对「跑完迁移的库」与「实体推导出的库」结构是否一致
//
// 为什么必须有这一支：DB_SYNCHRONIZE 已固定 false，全新部署的表结构
// 100% 来自 src/migrations/。迁移少一列，症状不是启动报错，而是运行到
// 某个查询时才 no such column —— 上线后才暴露。
//
// 做法：建两个临时库，一个只跑迁移，一个只跑 synchronize，
// 再逐表逐列比对。实体是唯一事实来源，两边对不上就是迁移欠了东西。
import 'reflect-metadata'
import { rm } from 'node:fs/promises'
import { DataSource, type DataSourceOptions } from 'typeorm'
import { ENTITIES } from '../config/database.config'
import { MIGRATIONS } from '../migrations'
import { say } from './report'

/** 两个临时库，与其他冒烟脚本同放 data/ 下便于一并清理 */
const MIGRATED_DB = 'data/parity-migrated.sqlite'
const SYNCED_DB = 'data/parity-synced.sqlite'

/** 迁移自带的记账表，不参与比对 */
const IGNORED_TABLES = new Set(['migrations'])

/** 一张表的结构：列名 → 类型（小写归一，sqlite 的类型写法在两条路径下可能大小写不同） */
type TableShape = Map<string, string>

let failed = 0

/** 记录一条校验结果 */
function check(ok: boolean, name: string, detail?: string): void {
  if (ok) {
    say(`  ✅ ${name}`)
    return
  }
  failed += 1
  say(`  ❌ ${name}${detail ? ` —— ${detail}` : ''}`)
}

/**
 * 读出一个库里全部业务表的结构
 * @param ds 已初始化的数据源
 */
async function readSchema(ds: DataSource): Promise<Map<string, TableShape>> {
  const rows: Array<{ name: string }> = await ds.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  )
  const schema = new Map<string, TableShape>()
  for (const { name } of rows) {
    if (IGNORED_TABLES.has(name)) continue
    const cols: Array<{ name: string; type: string }> = await ds.query(`PRAGMA table_info("${name}")`)
    const shape: TableShape = new Map()
    for (const c of cols) shape.set(c.name, (c.type || '').toLowerCase())
    schema.set(name, shape)
  }
  return schema
}

/**
 * 建一个临时库并返回其结构
 * @param file 数据文件路径
 * @param mode migrate = 只跑迁移；sync = 只跑 synchronize
 */
async function buildSchema(file: string, mode: 'migrate' | 'sync'): Promise<Map<string, TableShape>> {
  await rm(file, { force: true })
  const ds = new DataSource({
    type: 'better-sqlite3',
    database: file,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    synchronize: mode === 'sync',
  } as DataSourceOptions)
  await ds.initialize()
  if (mode === 'migrate') await ds.runMigrations()
  const schema = await readSchema(ds)
  await ds.destroy()
  return schema
}

async function main(): Promise<void> {
  say('【建库】')
  const migrated = await buildSchema(MIGRATED_DB, 'migrate')
  say(`  ✅ 迁移路径建出 ${migrated.size} 张表`)
  const synced = await buildSchema(SYNCED_DB, 'sync')
  say(`  ✅ 实体路径建出 ${synced.size} 张表`)

  say('\n【表是否齐全】')
  for (const table of synced.keys()) {
    check(migrated.has(table), `迁移建出了 ${table}`, '实体里有此表，迁移未建 —— 全新部署会缺表')
  }
  for (const table of migrated.keys()) {
    check(synced.has(table), `${table} 在实体中有对应`, '迁移建了实体里没有的表，属残留')
  }

  say('\n【列是否齐全】')
  for (const [table, want] of synced) {
    const got = migrated.get(table)
    if (!got) continue
    for (const [col, type] of want) {
      const actual = got.get(col)
      check(actual !== undefined, `${table}.${col} 已建`, '迁移缺此列 —— 运行到相关查询才会 no such column')
      if (actual !== undefined && actual !== type) {
        check(false, `${table}.${col} 类型一致`, `迁移=${actual}，实体=${type}`)
      }
    }
    for (const col of got.keys()) {
      check(want.has(col), `${table}.${col} 在实体中有对应`, '迁移建了实体里没有的列，属残留')
    }
  }

  await rm(MIGRATED_DB, { force: true })
  await rm(SYNCED_DB, { force: true })

  say(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  say(failed === 0 ? '迁移完备性：通过（全新部署可仅靠迁移建出完整结构）' : `迁移完备性：失败 ${failed} 项`)
  say(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  if (failed > 0) process.exitCode = 1
}

void main()

