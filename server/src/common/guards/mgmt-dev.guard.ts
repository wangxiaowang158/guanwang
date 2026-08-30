// ============================================================================
// 【临时措施 · 严禁公网部署】管理端开发期占位守卫
// ----------------------------------------------------------------------------
// 背景：管理后台登录目前仍走前端 Mock，后端未实现管理员认证，
//       因此 /api/mgmt/* 无法用真实管理员令牌鉴权。
//
// 本守卫仅校验一个固定的共享请求头令牌，不具备任何真实安全性：
//   - 无用户身份，无权限粒度，无失效机制
//   - 令牌明文写在 .env，泄露即完全失守
//
// 替换条件：后端实现管理员登录（签发 scope=admin 的 JWT）后，
//          用正式的 AdminGuard 替换本文件的全部引用，并删除本文件。
//
// 对应设计方案 7.4 节与风险清单 12.1。
// ============================================================================
import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { MGMT_DEV_TOKEN } from '../../config/app.config'

/** 占位令牌请求头名称 */
export const MGMT_DEV_TOKEN_HEADER = 'x-mgmt-dev-token'

@Injectable()
export class MgmtDevGuard implements CanActivate {
  private readonly logger = new Logger(MgmtDevGuard.name)
  private warned = false

  canActivate(context: ExecutionContext): boolean {
    // 首次命中时告警一次，避免这套临时机制被静默带到线上
    if (!this.warned) {
      this.logger.warn('管理端正在使用开发期占位守卫，不具备真实鉴权能力，严禁公网部署')
      this.warned = true
    }

    const req = context.switchToHttp().getRequest<Request>()
    const token = req.headers[MGMT_DEV_TOKEN_HEADER]
    if (typeof token !== 'string' || token !== MGMT_DEV_TOKEN) {
      throw new UnauthorizedException('管理端令牌无效')
    }
    return true
  }
}
