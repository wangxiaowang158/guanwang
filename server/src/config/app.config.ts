// 运行时配置 —— 收敛 process.env 读取，业务代码只依赖此模块
// 与前端 admin/src/config、web/src/config 的分层思路一致

/** 解析正整数，非法值回退默认 */
function toInt(value: string | undefined, fallback: number): number {
  const num = Number(value)
  return Number.isInteger(num) && num > 0 ? num : fallback
}

/** 解析布尔，仅字符串 'true' 视为真 */
function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true'
}

/** 服务监听端口 */
export const PORT = toInt(process.env.PORT, 3000)

/** 数据库类型 */
export const DB_TYPE = (process.env.DB_TYPE || 'sqlite').trim() as 'sqlite' | 'mysql'

/** SQLite 数据文件路径 */
export const DB_SQLITE_PATH = (process.env.DB_SQLITE_PATH || 'data/website.sqlite').trim()

/** 是否自动同步表结构（正式环境必须关闭） */
export const DB_SYNCHRONIZE = toBool(process.env.DB_SYNCHRONIZE, true)

/** MySQL 连接参数（DB_TYPE=mysql 时生效） */
export const MYSQL = {
  host: (process.env.DB_HOST || '127.0.0.1').trim(),
  port: toInt(process.env.DB_PORT, 3306),
  username: (process.env.DB_USERNAME || 'root').trim(),
  password: process.env.DB_PASSWORD || '',
  database: (process.env.DB_DATABASE || 'zrh_website').trim(),
}

/** 会员令牌配置 */
export const JWT_MEMBER = {
  secret: (process.env.JWT_MEMBER_SECRET || 'dev-member-secret-change-me').trim(),
  expiresIn: (process.env.JWT_MEMBER_EXPIRES_IN || '2h').trim(),
}

/** 管理端开发期占位令牌（正式鉴权落地后删除） */
export const MGMT_DEV_TOKEN = (process.env.MGMT_DEV_TOKEN || 'dev-mgmt-token-change-me').trim()

/** 限流配置 */
export const THROTTLE = {
  ttl: toInt(process.env.THROTTLE_TTL, 60),
  limit: toInt(process.env.THROTTLE_LIMIT, 60),
}

/** 跨域放行来源列表 */
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/** 令牌作用域，用于隔离会员与管理员两套身份 */
export const SCOPE_MEMBER = 'member'
