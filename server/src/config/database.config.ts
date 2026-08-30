// 数据源配置 —— SQLite 起步，切 MySQL 仅改 DB_TYPE 与连接参数，实体与仓储代码不变
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import type { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { DB_SQLITE_PATH, DB_SYNCHRONIZE, DB_TYPE, MYSQL } from './app.config'
import { Member } from '../modules/member/member.entity'
import { Feedback } from '../modules/feedback/feedback.entity'
import { FeedbackReply } from '../modules/feedback/feedback-reply.entity'
import { MemberLoginLog } from '../modules/login-log/login-log.entity'
import { AuthConfig } from '../modules/auth-config/auth-config.entity'

/** 全部实体，集中登记避免 glob 扫描在打包后失效 */
export const ENTITIES = [Member, Feedback, FeedbackReply, MemberLoginLog, AuthConfig]

/** 构建 TypeORM 配置 */
export function buildDataSourceOptions(): TypeOrmModuleOptions {
  if (DB_TYPE === 'mysql') {
    return {
      type: 'mysql',
      host: MYSQL.host,
      port: MYSQL.port,
      username: MYSQL.username,
      password: MYSQL.password,
      database: MYSQL.database,
      entities: ENTITIES,
      synchronize: DB_SYNCHRONIZE,
      timezone: 'Z',
    }
  }

  // SQLite：数据文件所在目录需先存在，否则 better-sqlite3 打不开连接
  const filePath = join(process.cwd(), DB_SQLITE_PATH)
  mkdirSync(join(filePath, '..'), { recursive: true })

  return {
    type: 'better-sqlite3',
    database: filePath,
    entities: ENTITIES,
    synchronize: DB_SYNCHRONIZE,
  }
}
