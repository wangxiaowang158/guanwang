// 菜单级权限守卫 —— 校验当前管理员是否被授予某个一级菜单的操作权限
// 必须挂在 AdminGuard 之后（依赖 req.admin）。
// 权限项取值为一级菜单名，与 admin 端 constants/menu.ts 同源。
//
// 前端侧边栏过滤只是体验层，真正的拦截在这里：
// 直接输 URL 或绕过前端调接口，同样会被拒。
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERM_KEY } from '../decorators/require-perm.decorator'
import type { RequestWithAdmin } from './admin.guard'

@Injectable()
export class PermGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 方法级优先于控制器级，未声明则不限制
    const required = this.reflector.getAllAndOverride<string | undefined>(PERM_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true

    const req = context.switchToHttp().getRequest<RequestWithAdmin>()
    const admin = req.admin
    if (!admin) throw new ForbiddenException('无访问权限')

    // 超管不受权限清单限制
    if (admin.isSuper) return true
    if (!admin.perms.includes(required)) {
      throw new ForbiddenException('无访问权限')
    }
    return true
  }
}
