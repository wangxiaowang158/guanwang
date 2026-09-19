// 落盘规则 —— 目录分桶与文件名生成的唯一来源
// 抽成模块级纯函数而非留在 service 里：multer 的 storage 配置在装饰器里求值，
// 拿不到 Nest 注入的实例，两边各写一份规则迟早不一致
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { BadRequestException } from '@nestjs/common'
import type { Request } from 'express'
import type { StorageEngine } from 'multer'
import { diskStorage } from 'multer'
import { UPLOAD } from '../../config/app.config'

/** 上传根目录绝对路径，与 SQLite 数据文件同样以工作目录为基准 */
export function uploadRootDir(): string {
  return join(process.cwd(), UPLOAD.dir)
}

/**
 * 计算落盘目录并确保存在
 * 按 YYYYMM 分桶，避免单目录文件数过多影响文件系统检索
 * @returns 绝对目录路径与相对上传根目录的子路径
 */
export function resolveUploadDir(): { absDir: string; subDir: string } {
  const now = new Date()
  const subDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const absDir = join(uploadRootDir(), subDir)
  mkdirSync(absDir, { recursive: true })
  return { absDir, subDir }
}

/**
 * 生成落盘文件名：时间戳 + 随机串，扩展名按 MIME 映射而非客户端文件名
 * @param mimeType 已通过白名单校验的 MIME
 * @param extMap MIME → 扩展名映射表
 */
export function buildUploadFileName(
  mimeType: string,
  extMap: Record<string, string>,
): string {
  const ext = extMap[mimeType] || '.bin'
  return `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`
}

/**
 * 拼接对外可访问的 URL
 * 返回站内相对路径，由网关或静态服务映射到上传目录
 * @param subDir 月份分桶目录
 * @param fileName 落盘文件名
 */
export function buildUploadUrl(subDir: string, fileName: string): string {
  return `${UPLOAD.urlPrefix}/${subDir}/${fileName}`
}

/** 视频上传的磁盘存储引擎：直接写盘，不经内存缓冲 */
function videoDiskStorage(): StorageEngine {
  return diskStorage({
    destination: (_req, _file, cb) => {
      try {
        cb(null, resolveUploadDir().absDir)
      } catch (err) {
        cb(err as Error, '')
      }
    },
    filename: (_req, file, cb) => {
      cb(null, buildUploadFileName(file.mimetype, UPLOAD.videoExts))
    },
  })
}

/**
 * 视频上传的 multer 选项
 * 走磁盘流式落盘：视频上限 100MB 量级，内存缓冲会把请求体整个读进堆内存，
 * 并发几个上传就能把进程压垮；图片 2MB 才可以继续用内存缓冲
 * MIME 在 fileFilter 里先拦一道，不合规的文件根本不会落盘；
 * 超限由 multer 自己抛 LIMIT_FILE_SIZE 并清理半截文件，无需额外收尾
 */
export function videoMulterOptions() {
  return {
    storage: videoDiskStorage(),
    limits: { fileSize: UPLOAD.videoMaxMb * 1024 * 1024, files: 1 },
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!(UPLOAD.videoMimes as readonly string[]).includes(file.mimetype)) {
        // 抛 HttpException 而非普通 Error：Nest 的 transformException 对其原样放行，
        // 普通 Error 会被当成未预期异常吞成 500「服务异常」
        cb(new BadRequestException('仅支持 MP4 / WebM / Ogg 格式视频'), false)
        return
      }
      cb(null, true)
    },
  }
}
