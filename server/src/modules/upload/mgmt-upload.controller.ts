// 后台上传接口 —— /api/mgmt/upload/*
// 上传是各内容模块的公共能力，不单独占一项权限，仅要求管理员登录
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { memoryStorage } from 'multer'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AI_IMAGE, UPLOAD } from '../../config/app.config'
import { AiImageService } from './ai-image.service'
import { AiImageGenerateDto, AiImageSaveDto } from './dto/ai-image.dto'
import { UploadService } from './upload.service'
import { videoMulterOptions } from './upload.storage'
import type { ImagePipelineOptions } from './image-pipeline'
import { SiteConfigService } from '../cms/site-config.service'

@Controller('mgmt/upload')
@UseGuards(AdminGuard)
export class MgmtUploadController {
  constructor(
    private readonly service: UploadService,
    private readonly aiImage: AiImageService,
    private readonly siteConfig: SiteConfigService,
  ) {}

  /**
   * 上传图片，返回站内访问地址
   * 大小上限由 multer 拦截（超限直接 413），类型白名单在 service 内校验
   */
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD.maxMb * 1024 * 1024, files: 1 },
    }),
  )
  async image(@UploadedFile() file?: Express.Multer.File, @Query('raw') raw?: string) {
    // raw=1：Logo、站点图标、二维码、分享图等品牌素材，不加水印、不转格式
    const url = await this.service.saveImage(file, raw === '1' ? undefined : await this.pipelineOptions())
    return { url }
  }

  /** 按后台「图片处理」配置组装加工选项；两项都关时返回 undefined，原样保存 */
  private async pipelineOptions(): Promise<ImagePipelineOptions | undefined> {
    const ext = await this.siteConfig.getExt()
    const wm = ext.watermark
    if (!wm.enabled && !wm.webp) return undefined
    let watermark: ImagePipelineOptions['watermark']
    if (wm.enabled) {
      // 水印文字未填时取公司简称，再取公司全称
      const site = await this.siteConfig.get()
      const text = wm.text || site.companyShort || site.companyName
      if (text) watermark = { text, position: wm.position }
    }
    return { watermark, webp: wm.webp }
  }

  /**
   * 查询 AI 生图是否已配置密钥，前端据此决定「AI 生成」页显示生成表单还是未启用提示
   * 一并下发候选张数与描述字数上限，前端不再各写一份常量
   */
  @Get('ai-image/status')
  aiStatus() {
    return { enabled: this.aiImage.isEnabled(), count: AI_IMAGE.count, promptMaxLen: AI_IMAGE.promptMaxLen }
  }

  /**
   * 按描述生成一批候选封面图（按量计费，故单独收紧限流）
   * 候选只暂存服务端内存，不落盘
   */
  @Post('ai-image')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async aiGenerate(@Body() dto: AiImageGenerateDto) {
    // IsOptional 放行 null，而 service 的默认参数只对 undefined 生效，这里统一兜底
    const items = await this.aiImage.generate(dto.prompt, dto.scene ?? 'cover')
    return { items }
  }

  /** 把选中的 AI 候选图落盘，返回站内访问地址 */
  @Post('ai-image/save')
  async aiSave(@Body() dto: AiImageSaveDto) {
    const url = await this.aiImage.saveCandidate(dto.id)
    return { url }
  }

  /**
   * 上传附件（PDF / Office），返回站内访问地址与原文件名
   * 原文件名只回给后台展示，落盘仍用随机名
   */
  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: UPLOAD.docMaxMb * 1024 * 1024, files: 1 },
    }),
  )
  async document(@UploadedFile() file?: Express.Multer.File) {
    const url = await this.service.saveDocument(file)
    // multer 按 latin1 解析 multipart 文件名，中文名须转回 utf8，否则后台看到的是乱码
    const name = file ? Buffer.from(file.originalname, 'latin1').toString('utf8') : ''
    return { url, name }
  }

  /**
   * 上传视频，返回站内访问地址
   * 与图片分开两个端点：两者体积上限差两个量级，共用端点等于把图片口子也开到 100MB
   */
  @Post('video')
  @UseInterceptors(FileInterceptor('file', videoMulterOptions()))
  async video(@UploadedFile() file?: Express.Multer.File) {
    const url = await this.service.saveVideo(file)
    return { url }
  }
}
