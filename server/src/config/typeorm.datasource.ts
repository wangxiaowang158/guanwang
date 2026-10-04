// 迁移 CLI 专用数据源 —— typeorm migration:run / revert / show 的入口
//
// 单独一个文件而非复用 app.module 的配置：CLI 不经 Nest 启动，
// 拿不到 ConfigModule 注入的 .env，须自行 config() 读取。
//
// 用法（在 server/ 目录下）：
//   npm run migration:run      应用全部未执行的迁移
//   npm run migration:show     查看已执行/待执行清单
//   npm run migration:revert   回滚最后一条
import 'reflect-metadata'
import { config } from 'dotenv'
import { DataSource, type DataSourceOptions } from 'typeorm'
import { buildDataSourceOptions } from './database.config'

// 须在 buildDataSourceOptions 读 process.env 之前完成
config()

/**
 * CLI 数据源
 * synchronize 强制关闭：迁移与自动同步同时生效会互相打断——
 * synchronize 先把表改成最新形状，随后迁移再去加同一列就会撞已存在的列
 */
export default new DataSource({
  ...(buildDataSourceOptions() as DataSourceOptions),
  synchronize: false,
})
