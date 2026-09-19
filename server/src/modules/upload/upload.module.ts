// 上传模块 —— 后台图片上传与落盘目录管理
// 导出 UploadService 供 main.ts 取上传根目录做静态资源托管
import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { MgmtUploadController } from './mgmt-upload.controller'
import { UploadService } from './upload.service'

@Module({
  imports: [AdminModule],
  controllers: [MgmtUploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
