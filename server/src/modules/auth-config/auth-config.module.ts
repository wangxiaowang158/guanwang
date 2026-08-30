// 注册登录配置模块 —— service 需被会员模块引用，故导出
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthConfig } from './auth-config.entity'
import { AuthConfigService } from './auth-config.service'
import { MgmtAuthConfigController } from './mgmt-auth-config.controller'

@Module({
  imports: [TypeOrmModule.forFeature([AuthConfig])],
  controllers: [MgmtAuthConfigController],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthConfigModule {}
