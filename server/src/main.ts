// 应用入口 —— 全局前缀、校验管道、统一响应、异常包装、跨域
import 'reflect-metadata'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { TransformInterceptor } from './common/interceptors/transform.interceptor'
import { AllExceptionFilter } from './common/filters/all-exception.filter'
import { CORS_ORIGINS, PORT } from './config/app.config'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  // 全局前缀 /api，与前端 VITE_API_PREFIX 约定一致
  app.setGlobalPrefix('api')

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
