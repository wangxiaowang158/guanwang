// 后台上传接口 —— /api/mgmt/upload/*
// 上传是各内容模块的公共能力，不单独占一项权限，仅要求管理员登录
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { memoryStorage } from 'multer'
import { AdminGuard } from '../../common/guards/admin.guard'
import { UPLOAD } from '../../config/app.config'
import { AiImageService } from './ai-image.service'
import { AiImageGenerateDto, AiImageSaveDto } from './dto/ai-image.dto'
import { UploadService } from './upload.service'
import { videoMulterOptions } from './upload.storage'

@Controller('mgmt/upload')
@UseGuards(AdminGuard)
export class MgmtUploadController {
  constructor(
    private readonly service: UploadService,
    private readonly aiImage: AiImageService,
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
  async image(@UploadedFile() file?: Express.Multer.File) {
    const url = await this.service.saveImage(file)
    return { url }
  }

  /** 查询 AI 生图是否已配置密钥，前端据此决定「AI 生成」页显示生成表单还是未启用提示 */
  @Get('ai-image/status')
  aiStatus() {
    return { enabled: this.aiImage.isEnabled() }
  }

  /**
   * 按描述生成一批候选封面图（按量计费，故单独收紧限流）
   * 候选只暂存服务端内存，不落盘
   */
  @Post('ai-image')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async aiGenerate(@Body() dto: AiImageGenerateDto) {
    const items = await this.aiImage.generate(dto.prompt)
    return { items }
  }

  /** 把选中的 AI 候选图落盘，返回站内访问地址 */
  @Post('ai-image/save')
  async aiSave(@Body() dto: AiImageSaveDto) {
    const url = await this.aiImage.saveCandidate(dto.id)
    return { url }
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
