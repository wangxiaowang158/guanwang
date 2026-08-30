// 建表验证脚本 —— 一次性初始化数据源并输出表结构，不常驻进程
// 用法：npx ts-node -r tsconfig-paths/register src/scripts/verify-schema.ts
import 'reflect-metadata'
import { config } from 'dotenv'
import { DataSource } from 'typeorm'
import { buildDataSourceOptions } from '../config/database.config'
import type { DataSourceOptions } from 'typeorm'

config()

async function main(): Promise<void> {
  const ds = new DataSource(buildDataSourceOptions() as DataSourceOptions)
  await ds.initialize()

  const tables = ds.entityMetadatas.map((m) => m.tableName).sort()
  console.info('数据源类型：', ds.options.type)
  console.info('已建表：', tables.join(', '))

  // 逐表输出实际列名，确认结构真的落库而非仅在元数据中
  for (const meta of ds.entityMetadatas) {
    const rows: Array<{ name: string }> = await ds.query(`PRAGMA table_info('${meta.tableName}')`)
    console.info(`  ${meta.tableName}（${rows.length} 列）：${rows.map((r) => r.name).join(', ')}`)
  }

  await ds.destroy()
}

main().catch((err) => {
  console.error('验证失败：', err)
  process.exit(1)
})
