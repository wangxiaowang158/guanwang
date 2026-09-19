// 后台上传接口 —— /api/mgmt/upload/*
// 上传是各内容模块的公共能力，不单独占一项权限，仅要求管理员登录
import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { AdminGuard } from '../../common/guards/admin.guard'
import { UPLOAD } from '../../config/app.config'
import { UploadService } from './upload.service'
import { videoMulterOptions } from './upload.storage'

@Controller('mgmt/upload')
@UseGuards(AdminGuard)
export class MgmtUploadController {
  constructor(private readonly service: UploadService) {}

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
