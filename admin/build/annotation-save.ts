// 开发期标注保存插件 —— 把原型标注数据写入 public/annotations/
// 仅在开发服务器生效，由 VITE_ENABLE_ANNOTATION_SAVE 控制是否挂载
import path from 'node:path'
import fs from 'node:fs'
import type { Plugin } from 'vite'

/** 标注保存请求体 */
interface AnnotationPayload {
  /** 页面路径，作为落盘文件名的来源 */
  page?: string
}

/** 请求体最大字节数，防止异常大包占满内存 */
const MAX_BODY_BYTES = 2 * 1024 * 1024

/**
 * 把页面路径转成安全的文件名
 * 只保留字母/数字/下划线/连字符，其余字符（含 . 与 /）折叠为 -，
 * 避免 ../ 造成目录穿越写到工程外
 * @param page 原始页面路径
 * @returns 安全文件名，无有效字符时返回 'index'
 */
function toSafeFileName(page: string): string {
  const name = page
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return name || 'index'
}

/**
 * 创建标注保存插件
 * @param outputDir 标注文件输出目录（绝对路径）
 */
export function annotationSavePlugin(outputDir: string): Plugin {
  return {
    name: 'annotation-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/annotation/save', (req, res) => {
        const reply = (status: number, code: number, message: string) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ code, message }))
        }

        if (req.method !== 'POST') {
          reply(405, 405, '仅支持 POST')
          return
        }

        let body = ''
        let aborted = false
        req.on('data', (chunk) => {
          if (aborted) return
          body += chunk
          if (body.length > MAX_BODY_BYTES) {
            aborted = true
            reply(413, 413, '标注数据过大')
            req.destroy()
          }
        })
        req.on('end', () => {
          if (aborted) return
          try {
            const data = JSON.parse(body) as AnnotationPayload
            if (typeof data.page !== 'string' || !data.page.trim()) {
              reply(400, 400, '缺少 page 参数')
              return
            }
            const filePath = path.join(outputDir, `${toSafeFileName(data.page)}.json`)
            fs.mkdirSync(outputDir, { recursive: true })
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
            reply(200, 200, '保存成功')
          } catch {
            reply(500, 500, '保存失败')
          }
        })
      })
    },
  }
}
