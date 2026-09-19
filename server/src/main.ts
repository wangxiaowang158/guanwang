// 应用入口 —— 全局前缀、校验管道、统一响应、异常包装、跨域、上传文件托管
import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { AllExceptionFilter } from './common/filters/all-exception.filter'
import { CORS_ORIGINS, PORT, UPLOAD } from './config/app.config'
import { UploadService } from './modules/upload/upload.service'

async function bootstrap(): Promise<void> {
  // 指定 Express 适配器：托管上传目录需要 useStaticAssets
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })

  // 全局前缀 /api，与前端 VITE_API_PREFIX 约定一致
  app.setGlobalPrefix('api')

  // 上传文件按原始路径直出，不走 /api 前缀；生产环境可由网关接管此前缀
  app.useStaticAssets(app.get(UploadService).getRootDir(), { prefix: UPLOAD.urlPrefix })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 剔除 DTO 未声明的字段，防止意外赋值
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )

  app.useGlobalInterceptors(new TransformInterceptor())
  app.useGlobalFilters(new AllExceptionFilter())

  // 仅放行配置中列出的来源；列表为空时不启用跨域（同源部署场景）
  if (CORS_ORIGINS.length > 0) {
    app.enableCors({ origin: CORS_ORIGINS, credentials: true })
  }

  await app.listen(PORT)
  new Logger('Bootstrap').log(`服务已启动：http://localhost:${PORT}/api`)
}

void bootstrap()
