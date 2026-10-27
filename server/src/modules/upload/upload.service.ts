// 上传落盘服务 —— 图片走内存缓冲，视频走磁盘流式
// 不沿用客户端原文件名：中文名与特殊字符在不同系统上行为不一致，且存在路径穿越风险
// 目录分桶与文件名规则见 upload.storage.ts，此处只做校验与编排
import { open, unlink, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { UPLOAD } from '../../config/app.config'
import {
  buildUploadFileName,
  buildUploadUrl,
  resolveUploadDir,
  uploadRootDir,
} from './upload.storage'
import { runImagePipeline, type ImagePipelineOptions } from './image-pipeline'

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)

  /** 上传根目录绝对路径，供静态资源托管使用 */
  getRootDir(): string {
    return uploadRootDir()
  }

  /**
   * 保存图片并返回访问地址
   * 走内存缓冲后手动落盘：单文件上限仅 2MB，换取「校验不通过时磁盘上不留残文件」
   * @param file multer 解析出的文件对象
   * @param pipeline 水印 / 转 WebP 选项；不传即原样保存
   * @returns 站内可访问的图片地址
   */
  async saveImage(file?: Express.Multer.File, pipeline?: ImagePipelineOptions): Promise<string> {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('请选择要上传的图片')
    }
    // 少数旧浏览器/工具把 JPG 报成 image/jpg、image/pjpeg：归一成标准写法，免得用户传的明明是 JPG 却被告知「仅支持 JPG」。
    // 归一后照样走下面的白名单与文件头核对，不放宽实际校验
    if (file.mimetype === 'image/jpg' || file.mimetype === 'image/pjpeg') file.mimetype = 'image/jpeg'
    // MIME 由客户端声明，此处再校验一次，防止绕过前端直接调接口
    if (!(UPLOAD.imageMimes as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG / PNG / WebP / GIF 格式图片')
    }
    // 声明可伪造，再按文件头核对：防止改了扩展名的非图片文件混进素材库
    if (!matchesMagic(file.mimetype, file.buffer)) {
      throw new BadRequestException('文件内容与图片格式不符，请重新选择')
    }
    // 水印 / 转 WebP；加工失败（极少见的损坏图）不阻断上传，按原图落盘
    let out = { buffer: file.buffer, mime: file.mimetype }
    if (pipeline) {
      try {
        out = await runImagePipeline(file.buffer, file.mimetype, pipeline)
      } catch (err) {
        this.logger.warn(`图片加工失败，按原图保存：${err instanceof Error ? err.message : String(err)}`)
      }
    }
    const { absDir, subDir } = resolveUploadDir()
    const fileName = buildUploadFileName(out.mime, UPLOAD.imageExts)
    await writeFile(join(absDir, fileName), out.buffer)
    return buildUploadUrl(subDir, fileName)
  }

  /**
   * 保存视频并返回访问地址
   * 文件已由 multer 磁盘存储写好，此处只做二次校验与地址拼接；
   * 校验不通过要手动删掉已落盘的文件，否则磁盘上会攒下无人引用的垃圾文件
   * @param file multer 解析出的文件对象（已落盘，带 path / destination / filename）
   * @returns 站内可访问的视频地址
   */
  async saveVideo(file?: Express.Multer.File): Promise<string> {
    if (!file?.filename || !file.path) {
      throw new BadRequestException('请选择要上传的视频')
    }
    // fileFilter 已拦过一道，此处再确认一次，避免上游配置改动后静默放行
    if (!(UPLOAD.videoMimes as readonly string[]).includes(file.mimetype)) {
      await this.removeFile(file.path)
      throw new BadRequestException('仅支持 MP4 / WebM / Ogg 格式视频')
    }
    if (!file.size) {
      await this.removeFile(file.path)
      throw new BadRequestException('视频内容为空，请重新选择')
    }
    // 已落盘的文件只读头部 12 字节核对格式，不符即删，避免播不了的文件混进素材库
    // 读头失败（文件被并发清理、权限异常）按校验不通过处理，同样删掉残留，不抛 500
    const head = await readHead(file.path).catch(() => Buffer.alloc(0))
    if (!matchesMagic(file.mimetype, head)) {
      await this.removeFile(file.path)
      throw new BadRequestException('文件内容与视频格式不符，请上传 H.264 编码的 MP4 等常见格式')
    }
    // 从落盘目录反推月份分桶名：目录由 resolveUploadDir 生成，取末段即可
    const subDir = file.destination.split(/[\\/]/).filter(Boolean).pop() || ''
    return buildUploadUrl(subDir, file.filename)
  }

  /**
   * 保存附件（PDF / Office 文档）并返回访问地址
   * 扩展名取自客户端文件名但只认白名单，且必须与文件头对得上：
   * 把 exe 改名成 pdf 传上来，文件头对不上即拒
   * @param file multer 内存缓冲的文件对象
   */
  async saveDocument(file?: Express.Multer.File): Promise<string> {
    if (!file || !file.buffer?.length) throw new BadRequestException('请选择要上传的文件')
    const ext = extname(file.originalname || '').toLowerCase()
    if (!(UPLOAD.docExts as readonly string[]).includes(ext)) {
      throw new BadRequestException('仅支持 PDF / Word / Excel / PPT 文件')
    }
    if (!matchesDocMagic(ext, file.buffer)) {
      throw new BadRequestException('文件内容与扩展名不符，请重新选择')
    }
    const { absDir, subDir } = resolveUploadDir()
    const fileName = buildUploadFileName(ext, { [ext]: ext })
    await writeFile(join(absDir, fileName), file.buffer)
    return buildUploadUrl(subDir, fileName)
  }

  /**
   * 删除已落盘的文件，失败只记日志不抛错
   * 清理失败不该改写给用户的报错语义——用户要看到的是「格式不对」，不是「删文件失败」
   * @param absPath 文件绝对路径
   */
  private async removeFile(absPath: string): Promise<void> {
    try {
      await unlink(absPath)
    } catch (err) {
      this.logger.warn(`清理上传残留文件失败：${absPath}`, err as Error)
    }
  }
}

/** 文件头长度：覆盖下方所有格式的判定区间 */
const HEAD_BYTES = 12

/** 读取已落盘文件的头部字节 */
async function readHead(absPath: string): Promise<Buffer> {
  const fh = await open(absPath, 'r')
  try {
    const buf = Buffer.alloc(HEAD_BYTES)
    const { bytesRead } = await fh.read(buf, 0, HEAD_BYTES, 0)
    return buf.subarray(0, bytesRead)
  } finally {
    await fh.close()
  }
}

/**
 * 按文件头判断内容是否与声明的 MIME 一致
 * 只认白名单内的格式，未列出的 MIME 一律不通过
 */
export function matchesMagic(mime: string, head: Buffer): boolean {
  if (head.length < HEAD_BYTES) return false
  const ascii = (start: number, end: number) => head.toString('ascii', start, end)
  switch (mime) {
    case 'image/png':
      return head[0] === 0x89 && ascii(1, 4) === 'PNG'
    case 'image/jpeg':
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
    case 'image/gif':
      return ascii(0, 4) === 'GIF8'
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
    case 'video/mp4':
      // ISO BMFF：第 4-8 字节为 ftyp 盒
      return ascii(4, 8) === 'ftyp'
    case 'video/webm':
      // EBML 头
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3
    case 'video/ogg':
      return ascii(0, 4) === 'OggS'
    default:
      return false
  }
}

/** OLE 复合文档头（旧版 doc / xls / ppt） */
const OLE_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])

/**
 * 附件文件头判定
 * docx/xlsx/pptx 是 zip 容器，再确认包内有 [Content_Types].xml——光看 PK 头，任何 zip 改个扩展名都能混进来
 * @param ext 小写扩展名，含点
 */
export function matchesDocMagic(ext: string, buf: Buffer): boolean {
  if (buf.length < 8) return false
  switch (ext) {
    case '.pdf':
      return buf.toString('ascii', 0, 5) === '%PDF-'
    case '.doc':
    case '.xls':
    case '.ppt':
      return buf.subarray(0, 8).equals(OLE_MAGIC)
    case '.docx':
    case '.xlsx':
    case '.pptx':
      // OOXML 规范要求 [Content_Types].xml 位于包内，其文件名以明文出现在本地文件头里
      return buf[0] === 0x50 && buf[1] === 0x4b && buf.includes('[Content_Types].xml')
    default:
      return false
  }
}
