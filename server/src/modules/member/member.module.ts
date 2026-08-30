// 会员模块 —— 前台认证与资料 + 后台会员管理
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { Member } from './member.entity'
import { MemberService } from './member.service'
import { MemberAuthService } from './member-auth.service'
import { SmsCodeService } from './sms-code.service'
import { CaptchaService } from './captcha.service'
import { PortalAuthController } from './portal-auth.controller'
import { PortalMemberController } from './portal-member.controller'
import { MgmtMemberController } from './mgmt-member.controller'
import { MemberGuard } from '../../common/guards/member.guard'
import { AuthConfigModule } from '../auth-config/auth-config.module'
import { LoginLogModule } from '../login-log/login-log.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Member]),
    // 密钥在签发与校验处显式传入，此处不设全局默认，避免误用管理端密钥
    JwtModule.register({}),
    AuthConfigModule,
    LoginLogModule,
  ],
  controllers: [PortalAuthController, PortalMemberController, MgmtMemberController],
  providers: [MemberService, MemberAuthService, SmsCodeService, CaptchaService, MemberGuard],
  // 导出 MemberGuard 及其依赖的 JwtModule，供反馈等其他模块的会员接口复用
  exports: [MemberService, MemberGuard, JwtModule],
})
export class MemberModule {}
