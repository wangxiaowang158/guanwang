// 根模块 —— 装载配置、数据源、限流与各业务模块
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerModule } from '@nestjs/throttler'
import { buildDataSourceOptions } from './config/database.config'
import { THROTTLE } from './config/app.config'
import { HealthController } from './common/health.controller'
import { MemberModule } from './modules/member/member.module'
import { AuthConfigModule } from './modules/auth-config/auth-config.module'
import { LoginLogModule } from './modules/login-log/login-log.module'
import { FeedbackModule } from './modules/feedback/feedback.module'

@Module({
  imports: [
    // 全局读取 .env，须在其他模块之前完成
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    // 全局默认限流；注册登录等敏感接口在各自控制器上单独收紧
    ThrottlerModule.forRoot([{ ttl: THROTTLE.ttl * 1000, limit: THROTTLE.limit }]),
    AuthConfigModule,
    LoginLogModule,
    MemberModule,
    FeedbackModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
