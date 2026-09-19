// 上传落盘服务 —— 图片走内存缓冲，视频走磁盘流式
// 不沿用客户端原文件名：中文名与特殊字符在不同系统上行为不一致，且存在路径穿越风险
// 目录分桶与文件名规则见 upload.storage.ts，此处只做校验与编排
import { unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { UPLOAD } from '../../config/app.config'
import {
  buildUploadFileName,
  buildUploadUrl,
  resolveUploadDir,
  uploadRootDir,
} from './upload.storage'

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
   * @returns 站内可访问的图片地址
   */
  async saveImage(file?: Express.Multer.File): Promise<string> {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('请选择要上传的图片')
    }
    // MIME 由客户端声明，此处再校验一次，防止绕过前端直接调接口
    if (!(UPLOAD.imageMimes as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('仅支持 JPG / PNG / WebP / GIF 格式图片')
    }
    const { absDir, subDir } = resolveUploadDir()
    const fileName = buildUploadFileName(file.mimetype, UPLOAD.imageExts)
    await writeFile(join(absDir, fileName), file.buffer)
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
    // 从落盘目录反推月份分桶名：目录由 resolveUploadDir 生成，取末段即可
    const subDir = file.destination.split(/[\\/]/).filter(Boolean).pop() || ''
    return buildUploadUrl(subDir, file.filename)
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
