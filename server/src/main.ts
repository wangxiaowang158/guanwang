// 应用入口 —— 全局前缀、校验管道、统一响应、异常包装、跨域、上传文件托管
import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { AllExceptionFilter } from './common/filters/all-exception.filter'
import { CORS_ORIGINS, PORT, UPLOAD } from './config/app.config'
import {
  securityHeadersMiddleware,
  uploadSecurityHeadersMiddleware,
} from './common/middleware/security-headers.middleware'
import { UploadService } from './modules/upload/upload.service'

async function bootstrap(): Promise<void> {
  // 指定 Express 适配器：托管上传目录需要 useStaticAssets
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })

  // 信任回环与内网段的代理，使 req.ip 取 X-Forwarded-For 中的真实客户端地址。
  // 限流（ThrottlerGuard）按 req.ip 分桶，取错则全站共用一个桶。
  // 生产链路是「宝塔 → gateway 容器 → backend」两跳，且两跳都在内网/回环：
  // 若只信 1 跳，取到的是宝塔所在的 docker 网桥地址，所有访客仍共用一个桶。
  // 按网段而非跳数信任：Express 从右往左剥掉受信地址，停在第一个公网地址，
  // 客户端自带的伪造 XFF 位于更左侧，不会被采信
  app.set('trust proxy', 'loopback, uniquelocal')

  // 安全响应头：须在路由与静态资源之前注册，才能覆盖 /api/* 与 /uploads/* 两类响应。
  // 生产环境以网关下发的为准，网关会剥掉这里发的同名头，不会重复
  app.use(securityHeadersMiddleware)
  // 上传目录再收紧一档：内容由用户上传，比接口响应更需要防被当文档打开
  app.use(UPLOAD.urlPrefix, uploadSecurityHeadersMiddleware)

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
