/// <reference types="vite/client" />

/** .env 中可用的自定义环境变量（新增变量需同步此处与 .env.example） */
interface ImportMetaEnv {
  /** 部署基础路径 */
  readonly VITE_BASE_URL?: string
  /** 开发服务器端口 */
  readonly VITE_PORT?: string
  /** Mock 开关，'true' 启用 */
  readonly VITE_USE_MOCK?: string
  /** 接口基础地址，空串表示同源相对路径 */
  readonly VITE_API_BASE_URL?: string
  /** 真实后端代理目标 */
  readonly VITE_PROXY_TARGET?: string
  /** 接口路径前缀 */
  readonly VITE_API_PREFIX?: string
  /** 管理端真实后端接口的占位令牌（开发期措施，严禁公网部署） */
  readonly VITE_MGMT_DEV_TOKEN?: string
  /** 地图数据源代理目标 */
  readonly VITE_MAP_API_TARGET?: string
  /** 标注保存中间件开关，'true' 启用 */
  readonly VITE_ENABLE_ANNOTATION_SAVE?: string
  /** 图片上传大小上限（MB） */
  readonly VITE_UPLOAD_MAX_MB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
