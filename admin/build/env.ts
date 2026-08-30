// 构建期环境变量解析 —— 把 .env 的字符串值收敛成带默认值的强类型配置
// 供 vite.config.ts 使用；运行时配置见 src/config/index.ts

/** 构建期可用的环境配置 */
export interface BuildEnv {
  /** 部署基础路径 */
  base: string
  /** 开发服务器端口 */
  port: number
  /** 是否启用内置 Mock */
  useMock: boolean
  /** 接口基础地址，空串表示同源相对路径 */
  apiBaseUrl: string
  /** 真实后端代理目标 */
  proxyTarget: string
  /** 接口路径前缀 */
  apiPrefix: string
  /** 地图数据源代理目标 */
  mapApiTarget: string
  /** 是否挂载标注保存中间件 */
  enableAnnotationSave: boolean
}

/**
 * 走真实后端的接口子前缀（相对 apiPrefix）
 * portal 为前台会员接口，mgmt 为管理端会员/反馈接口；其余路径仍由 Mock 拦截
 */
export const REAL_BACKEND_SUBPREFIXES = ['/portal', '/mgmt'] as const

/**
 * 拼出走真实后端的完整路径前缀
 * @param apiPrefix 规范化后的接口前缀（如 /api）
 */
export function resolveRealBackendPrefixes(apiPrefix: string): string[] {
  return REAL_BACKEND_SUBPREFIXES.map((sub) => `${apiPrefix}${sub}`)
}

/** 解析布尔型环境变量，仅 'true' 视为真 */
function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true'
}

/** 解析端口，非法值回退到默认端口 */
function toPort(value: string | undefined, fallback: number): number {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback
}

/** 规范化路径前缀：确保以 / 开头且不以 / 结尾 */
function normalizePrefix(value: string | undefined, fallback: string): string {
  const raw = (value || '').trim() || fallback
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash
}

/**
 * 规范化部署基础路径：Vite 要求同时以 / 开头和结尾
 * 支持子目录部署（如 /admin/）与 CDN 地址，含协议相对写法（//cdn.example.com/admin/）
 */
function normalizeBase(value: string | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return '/'
  const withTrailing = raw.endsWith('/') ? raw : `${raw}/`
  // 外部地址原样保留，仅补尾斜杠；显式覆盖协议相对写法，不依赖后续分支兜底
  if (/^(https?:)?\/\//.test(withTrailing)) return withTrailing
  return withTrailing.startsWith('/') ? withTrailing : `/${withTrailing}`
}

/**
 * 从 vite loadEnv 的结果解析构建期配置
 * @param env loadEnv 返回的原始键值对
 */
export function resolveBuildEnv(env: Record<string, string>): BuildEnv {
  return {
    base: normalizeBase(env.VITE_BASE_URL),
    port: toPort(env.VITE_PORT, 3810),
    useMock: toBool(env.VITE_USE_MOCK, true),
    apiBaseUrl: (env.VITE_API_BASE_URL || '').trim(),
    proxyTarget: (env.VITE_PROXY_TARGET || '').trim() || 'http://localhost:3000',
    apiPrefix: normalizePrefix(env.VITE_API_PREFIX, '/api'),
    mapApiTarget: (env.VITE_MAP_API_TARGET || '').trim() || 'https://geo.datav.aliyun.com',
    enableAnnotationSave: toBool(env.VITE_ENABLE_ANNOTATION_SAVE, true),
  }
}
