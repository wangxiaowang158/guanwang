// 登录日志模块 —— service 需被会员认证模块引用，故导出
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MemberLoginLog } from './login-log.entity'
import { Member } from '../member/member.entity'
import { LoginLogService } from './login-log.service'
import { MgmtLoginLogController } from './mgmt-login-log.controller'
import { AdminModule } from '../admin/admin.module'

@Module({
  // 需查会员昵称，故一并注册 Member 仓储；AdminModule 提供后台接口的守卫
  imports: [TypeOrmModule.forFeature([MemberLoginLog, Member]), AdminModule],
  controllers: [MgmtLoginLogController],
  providers: [LoginLogService],
  exports: [LoginLogService],
})
export class LoginLogModule {}
