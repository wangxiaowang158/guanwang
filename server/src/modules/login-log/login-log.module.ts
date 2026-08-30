// 登录日志模块 —— service 需被会员认证模块引用，故导出
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MemberLoginLog } from './login-log.entity'
import { Member } from '../member/member.entity'
import { LoginLogService } from './login-log.service'
import { MgmtLoginLogController } from './mgmt-login-log.controller'

@Module({
  // 需查会员昵称，故一并注册 Member 仓储
  imports: [TypeOrmModule.forFeature([MemberLoginLog, Member])],
  controllers: [MgmtLoginLogController],
  providers: [LoginLogService],
  exports: [LoginLogService],
})
export class LoginLogModule {}
