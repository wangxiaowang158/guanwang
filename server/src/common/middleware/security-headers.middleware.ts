// 安全响应头 —— 后端自身这一层
//
// 生产环境走网关，安全头以 docker/nginx/security-headers.conf 为准，
// 网关会把本中间件发出的同名头剥掉（hide-upstream-security-headers.conf），
// 不会出现重复头。本层存在的意义是"不经网关直连时仍有基本防护"：
// 本地开发、内网排障、以及有人把 3000 端口直接暴露出去的情况。
//
// 没有引 helmet：需要的就是下面这几个固定头，装一个依赖来生成几行字符串
// 不划算，且 helmet 的默认 CSP 与本项目的实际取值差得远，仍要逐项覆写。
import type { NextFunction, Request, Response } from 'express'

/**
 * 与网关保持一致的基础安全头
 * 注意 X-Frame-Options / frame-ancestors 只约束 iframe 类嵌入，
 * 不影响 <img> / <video> 加载上传目录里的图片与视频
 */
const BASE_HEADERS: Record<string, string> = {
  // 禁止按内容猜测 MIME：上传目录直出用户文件，猜测会把伪装成图片的 HTML 当页面执行
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

/**
 * 接口与上传文件都不是"页面"，不需要为脚本样式开任何口子，
 * 故一律 default-src 'none'：万一有 HTML 类响应被直接导航打开，里面什么都动不了。
 * CSP 只对文档与 worker 生效，对 JSON / 图片 / 视频这类子资源响应无副作用
 */
const STRICT_CSP =
  "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"

/**
 * 写入安全响应头
 * 用 Express 中间件而非 NestMiddleware：须覆盖 useStaticAssets 托管的上传目录，
 * 而静态资源不走 Nest 的路由层，只有 app.use 注册的中间件能拦到
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  for (const [name, value] of Object.entries(BASE_HEADERS)) {
    res.setHeader(name, value)
  }
  res.setHeader('Content-Security-Policy', STRICT_CSP)
  next()
}

/**
 * 上传目录额外补的头
 * 单独一档的原因：上传内容是用户可控的，除了不嗅探 MIME，
 * 还要禁掉浏览器把它当可下载的同源文档打开时的一切能力
 * @returns Express 中间件
 */
export function uploadSecurityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // sandbox 让响应即便被当作文档导航打开也处于最严格的沙箱：
  // 无脚本、无表单、无同源身份。图片与视频经 <img> / <video> 作为子资源加载，
  // 不受 CSP sandbox 影响，正常显示
  res.setHeader('Content-Security-Policy', `${STRICT_CSP}; sandbox`)
  next()
}
