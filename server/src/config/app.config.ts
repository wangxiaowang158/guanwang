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

/** 管理员令牌配置（scope=admin，与会员令牌密钥严格分开） */
export const JWT_ADMIN = {
  secret: (process.env.JWT_ADMIN_SECRET || 'dev-admin-secret-change-me').trim(),
  expiresIn: (process.env.JWT_ADMIN_EXPIRES_IN || '8h').trim(),
}

/** 初始管理员账号：仅在管理员表为空时用于创建首个账号 */
export const ADMIN_SEED = {
  account: (process.env.ADMIN_SEED_ACCOUNT || 'admin').trim(),
  password: process.env.ADMIN_SEED_PASSWORD || 'admin123456',
}

/** 上传配置：目录、单文件大小上限、可访问的 URL 前缀 */
export const UPLOAD = {
  dir: (process.env.UPLOAD_DIR || 'data/uploads').trim(),
  maxMb: toInt(process.env.UPLOAD_MAX_MB, 2),
  /** 视频单独一档上限：视频体积与图片不在一个量级，共用一个值会把图片口子开得过大 */
  videoMaxMb: toInt(process.env.UPLOAD_VIDEO_MAX_MB, 100),
  urlPrefix: '/uploads',
  /** 允许的图片 MIME，与前端 UPLOAD_IMAGE_MIMES 保持一致 */
  imageMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  /** MIME 对应落盘扩展名：不沿用客户端文件名，避免伪造扩展名 */
  imageExts: {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  } as Record<string, string>,
  /**
   * 允许的视频 MIME，与前端 UPLOAD_VIDEO_MIMES 保持一致
   * 只收浏览器能直接用 <video> 播的容器格式，不收需转码的 avi/mov/wmv
   */
  videoMimes: ['video/mp4', 'video/webm', 'video/ogg'] as const,
  videoExts: {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv',
  } as Record<string, string>,
}

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

/** 管理员令牌作用域；与 SCOPE_MEMBER 互斥，守卫两侧都做强校验 */
export const SCOPE_ADMIN = 'admin'
