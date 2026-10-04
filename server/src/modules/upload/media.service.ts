// 素材库服务 —— 列出上传目录已有文件，并支持删除无人引用的素材
//
// 数据源是磁盘而非数据库：上传记录本就没有落表，文件系统才是唯一事实。
// 因此列表在内存里完成过滤、排序与分页——上传目录是人工运营积累的量级
// （千级），一次 readdir 递归远快于为它单独维护一张会与磁盘失同步的表。
import { unlink } from 'node:fs/promises'
import { basename, extname, relative, resolve, sep } from 'node:path'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { UPLOAD } from '../../config/app.config'
import { resolvePaging, type PageResult } from '../../common/pagination'
import type { MediaQueryDto } from './dto/media.dto'
import type { MediaItemVo, MediaStatVo } from './vo/media.vo'
import { uploadRootDir } from './upload.storage'
import { collectCorpus, walkUploads, type DiskFile } from './upload-scan'

/** 素材类型分类依据：扩展名而非 MIME——磁盘上只有文件名，没有 MIME */
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const
const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.ogv'] as const

/** 新文件保护期（毫秒），与孤儿清理脚本一致：期内不标记为「未引用」 */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * 分页查询素材列表
   * @param query 类型筛选、关键词、排序与分页参数
   * @returns 分页结果，附带整体统计
   */
  async list(query: MediaQueryDto): Promise<PageResult<MediaItemVo> & { stat: MediaStatVo }> {
    const rootDir = uploadRootDir()
    const files = await this.safeWalk(rootDir)
    // 引用判定要查全库，只在需要「未引用」信息时才做
    const corpus = await collectCorpus(this.dataSource)
    const now = Date.now()

    const all: MediaItemVo[] = files.map((f) => this.toVo(f, rootDir, corpus, now))

    let filtered = all
    if (query.type && query.type !== 'all') {
      filtered = filtered.filter((item) => item.type === query.type)
    }
    if (query.unusedOnly) {
      filtered = filtered.filter((item) => !item.referenced && !item.recent)
    }
    const keyword = query.keyword?.trim()
    if (keyword) {
      const lower = keyword.toLowerCase()
      filtered = filtered.filter((item) => item.name.toLowerCase().includes(lower))
    }

    // 默认按修改时间倒序：运营找刚传的图远多于找最老的图
    const desc = query.sortOrder !== 'asc'
    filtered.sort((a, b) => {
      const diff = query.sortBy === 'size' ? a.size - b.size : a.mtime - b.mtime
      return desc ? -diff : diff
    })

    const { page, pageSize, skip } = resolvePaging(query.page, query.pageSize, {
      defaultSize: 24,
      maxSize: 100,
    })

    return {
      list: filtered.slice(skip, skip + pageSize),
      total: filtered.length,
      page,
      pageSize,
      // 统计取全量而非当前筛选结果：运营要看的是「盘里一共多少、能清多少」
      stat: {
        total: all.length,
        image: all.filter((i) => i.type === 'image').length,
        video: all.filter((i) => i.type === 'video').length,
        other: all.filter((i) => i.type === 'other').length,
        unused: all.filter((i) => !i.referenced && !i.recent).length,
        totalSize: all.reduce((sum, i) => sum + i.size, 0),
        unusedSize: all
          .filter((i) => !i.referenced && !i.recent)
          .reduce((sum, i) => sum + i.size, 0),
      },
    }
  }

  /**
   * 删除一个素材文件
   *
   * 三道闸门缺一不可：路径必须落在上传目录内、文件必须存在、且必须无人引用。
   * 第三道是重点——删掉仍被引用的图会让线上页面直接裂图，且不可撤销
   * @param urlPath 素材的站内访问地址，如 /uploads/202609/xxx.jpg
   */
  async remove(urlPath: string): Promise<{ url: string }> {
    const rootDir = uploadRootDir()
    const absPath = this.toAbsPath(urlPath, rootDir)

    const files = await this.safeWalk(rootDir)
    const target = files.find((f) => f.absPath === absPath)
    if (!target) throw new NotFoundException('素材不存在或已被删除')

    const corpus = await collectCorpus(this.dataSource)
    if (corpus.includes(basename(target.absPath))) {
      throw new BadRequestException('该素材仍被内容或站点配置引用，请先解除引用再删除')
    }

    try {
      await unlink(target.absPath)
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      this.logger.error(`素材删除失败：${target.urlPath}，${reason}`)
      throw new BadRequestException('素材删除失败，请稍后重试')
    }
    return { url: target.urlPath }
  }

  /**
   * 把站内 URL 还原为绝对路径，并确认它落在上传目录内
   *
   * 这是本模块唯一接受外部路径的入口，故防穿越必须在此收口：
   * 入参形如 `/uploads/../../etc/passwd` 时，resolve 后会跳出上传根目录，
   * 只比对前缀字符串拦不住（`/uploads/../x` 的前缀是合法的）
   * @param urlPath 外部传入的站内地址
   * @param rootDir 上传根目录绝对路径
   */
  private toAbsPath(urlPath: string, rootDir: string): string {
    const raw = (urlPath || '').trim()
    if (!raw.startsWith(`${UPLOAD.urlPrefix}/`)) {
      throw new BadRequestException('素材地址不合法')
    }
    // 地址可能是 URL 编码形态（中文名），解码失败说明本就不是合法地址
    let relPath: string
    try {
      relPath = decodeURIComponent(raw.slice(UPLOAD.urlPrefix.length + 1))
    } catch {
      throw new BadRequestException('素材地址不合法')
    }
    // NUL 字节会让底层 API 在路径中途截断，绕过后续校验
    if (!relPath || relPath.includes('\0')) {
      throw new BadRequestException('素材地址不合法')
    }

    const absPath = resolve(rootDir, relPath)
    const rel = relative(rootDir, absPath)
    // 空串表示恰好等于根目录本身，以 .. 开头表示跳出了根目录
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) {
      throw new BadRequestException('素材地址不合法')
    }
    return absPath
  }

  /**
   * 扫描上传目录；目录不存在时视为空而非报错
   * 全新部署还没传过任何文件时目录确实不存在，此时素材库应显示「暂无素材」
   * @param rootDir 上传根目录绝对路径
   */
  private async safeWalk(rootDir: string): Promise<DiskFile[]> {
    try {
      return await walkUploads(rootDir, rootDir)
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'ENOENT') return []
      // 权限不足等其他错误必须暴露：静默返回空会让运营以为素材全丢了
      const reason = err instanceof Error ? err.message : String(err)
      this.logger.error(`上传目录扫描失败（${code ?? '未知'}）：${reason}`)
      throw new BadRequestException('上传目录读取失败，请检查部署配置')
    }
  }

  /**
   * 磁盘文件转列表项
   * @param file 磁盘文件信息
   * @param rootDir 上传根目录，用于推出所属月份目录
   * @param corpus 全库引用语料
   * @param now 当前时刻，统一取值避免逐条调用 Date.now 产生分界抖动
   */
  private toVo(file: DiskFile, rootDir: string, corpus: string, now: number): MediaItemVo {
    const name = basename(file.absPath)
    const ext = extname(name).toLowerCase()
    // 相对路径的首段即月份分桶目录；文件直接落在根目录时为空
    const rel = relative(rootDir, file.absPath).split(sep)
    return {
      url: file.urlPath,
      name,
      ext,
      type: this.classify(ext),
      size: file.size,
      mtime: file.mtimeMs,
      bucket: rel.length > 1 ? rel[0] : '',
      referenced: corpus.includes(name),
      recent: now - file.mtimeMs < GRACE_PERIOD_MS,
    }
  }

  /**
   * 按扩展名归类
   * @param ext 小写扩展名，含点
   */
  private classify(ext: string): MediaItemVo['type'] {
    if ((IMAGE_EXTS as readonly string[]).includes(ext)) return 'image'
    if ((VIDEO_EXTS as readonly string[]).includes(ext)) return 'video'
    return 'other'
  }
}
