// 上传模块 —— 后台图片上传、素材库与落盘目录管理
// 导出 UploadService 供 main.ts 取上传根目录做静态资源托管
import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { CmsModule } from '../cms/cms.module'
import { AiImageService } from './ai-image.service'
import { MediaService } from './media.service'
import { MgmtMediaController } from './mgmt-media.controller'
import { MgmtUploadController } from './mgmt-upload.controller'
import { UploadService } from './upload.service'

@Module({
  // CmsModule 提供 SiteConfigService：图片上传按「图片处理」配置决定是否加水印 / 转 WebP
  imports: [AdminModule, CmsModule],
  controllers: [MgmtUploadController, MgmtMediaController],
  providers: [UploadService, MediaService, AiImageService],
  exports: [UploadService],
})
export class UploadModule {}
