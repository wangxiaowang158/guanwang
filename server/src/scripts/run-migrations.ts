// 迁移执行器 —— 容器内与本地均可用
//
// 为什么不直接用 typeorm CLI：CLI 走 typeorm-ts-node-commonjs，依赖 ts-node，
// 而生产镜像只装了 dependencies（ts-node 在 devDependencies 里），容器内跑不起来。
// 本脚本编译进 dist，容器内执行：
//   docker compose exec backend node dist/scripts/run-migrations.js
// 本地（ts-node 在时）等价于 npm run migration:run。
//
// 退出码：成功 0，失败 1——供 CI 与部署脚本判断是否继续启动。
import 'reflect-metadata'
import { config } from 'dotenv'
import { DataSource, type DataSourceOptions } from 'typeorm'
import { buildDataSourceOptions } from '../config/database.config'

config()

/**
 * 脚本输出
 * 命令行脚本的 stdout 就是它的界面，不是调试日志，故不用 console
 * @param line 输出内容，自动补换行
 */
function out(line = ''): void {
  process.stdout.write(`${line}\n`)
}

async function main(): Promise<void> {
  // synchronize 强制关闭：它与迁移同时生效会互相打断——
  // synchronize 先把表改成最新形状，迁移再去加同一列就会撞已存在的列
  const ds = new DataSource({
    ...(buildDataSourceOptions() as DataSourceOptions),
    synchronize: false,
  })

  await ds.initialize()
  try {
    const applied = await ds.runMigrations({ transaction: 'each' })
    if (applied.length === 0) {
      out('没有待执行的迁移，表结构已是最新。')
      return
    }
    out(`已执行 ${applied.length} 条迁移：`)
    for (const m of applied) out(`  ${m.name}`)
  } finally {
    await ds.destroy()
  }
}

main().catch((err: unknown) => {
  const reason = err instanceof Error ? err.message : String(err)
  process.stderr.write(`迁移失败：${reason}\n`)
  process.exit(1)
})
