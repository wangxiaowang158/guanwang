// 管理员模块 —— 后台登录认证 + 账号与权限维护
// AdminGuard 与 PermGuard 由本模块导出，供其余所有 mgmt 接口复用
import { Module, OnModuleInit } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { Admin } from './admin.entity'
import { AdminService } from './admin.service'
import { AdminAuthService } from './admin-auth.service'
import { MgmtAuthController } from './mgmt-auth.controller'
import { MgmtAdminController } from './mgmt-admin.controller'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    // 密钥在签发与校验处显式传入，此处不设全局默认，避免误用会员端密钥
    JwtModule.register({}),
  ],
  controllers: [MgmtAuthController, MgmtAdminController],
  providers: [AdminService, AdminAuthService, AdminGuard, PermGuard],
  // 其他模块的 mgmt 控制器需要这两个守卫，连同 JwtModule 一并导出
  exports: [AdminService, AdminGuard, PermGuard, JwtModule],
})
export class AdminModule implements OnModuleInit {
  constructor(private readonly adminService: AdminService) {}

  /** 启动时确保存在首个超管账号，避免全新部署无法登录 */
  async onModuleInit(): Promise<void> {
    await this.adminService.ensureSeedAdmin()
  }
}
