// 栏目级权限守卫 —— 内容接口按「该内容所属顶级栏目」校验权限
// 依据 SRS 3.4：内容管理可按栏目分别授予，故不能整体挂「栏目管理」权限，
// 否则只授权「新闻资讯」的账号会连自己那一个栏目的内容都改不了。
//
// 必须挂在 AdminGuard 之后（依赖 req.admin）。
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { RequestWithAdmin } from '../../../common/guards/admin.guard'
import { ChannelService } from '../channel.service'

@Injectable()
export class ChannelPermGuard implements CanActivate {
  constructor(private readonly channelService: ChannelService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>()
    const admin = req.admin
    if (!admin) throw new ForbiddenException('无访问权限')

    // 超管不受权限清单限制
    if (admin.isSuper) return true

    const channelKey = this.extractChannelKey(req)
    if (!channelKey) throw new ForbiddenException('缺少栏目标识，无法校验权限')

    // 所属顶级栏目名或其挂靠目标名，命中任一即放行
    const names = await this.channelService.resolvePermNames(channelKey)
    if (!names.length) throw new ForbiddenException('栏目不存在或无访问权限')
    if (!names.some(n => admin.perms.includes(n))) throw new ForbiddenException('无访问权限')
    return true
  }

  /**
   * 从查询串或请求体取栏目标识
   * 内容接口有 GET/DELETE（query）与 POST/PUT（body）两类，取值位置不同
   * 两处同时出现且不一致时返回空串（拒绝）：业务层只读其中一处，
   * 否则可「按 query 的 A 栏目过守卫、按 body 的 B 栏目执行」越权
   */
  private extractChannelKey(req: RequestWithAdmin): string {
    const q = (req.query as Record<string, unknown> | undefined)?.channelKey
    const b = (req.body as Record<string, unknown> | undefined)?.channelKey
    const fromQuery = typeof q === 'string' ? q.trim() : ''
    const fromBody = typeof b === 'string' ? b.trim() : ''
    if (fromQuery && fromBody && fromQuery !== fromBody) return ''
    return fromQuery || fromBody
  }
}
