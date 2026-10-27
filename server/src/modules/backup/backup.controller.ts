// 数据备份 —— 后台一键导出全部业务数据（JSON），仅超级管理员可用
//
// 为什么导出 JSON 而非数据库文件：部署可能是 sqlite 也可能是 MySQL，
// 导库文件要分别处理且 sqlite 运行中拷文件可能拿到半写状态；按实体逐表读出来的 JSON 两边通用、可读、可 diff。
// 不含上传文件本身（可能数 GB），只含它们的地址；文件请随数据卷一并备份，界面上会写明。
//
// 为什么只给超管：导出物含管理员与会员的密码哈希、手机号等敏感数据，
// 按菜单授权的普通管理员即便有「站点工具」权限也不该拿得到全库
import { Controller, ForbiddenException, Get, Query, Req, Res, UseGuards } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import type { Response } from 'express'
import { DataSource } from 'typeorm'
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator'
import { AdminGuard, type CurrentAdminInfo, type RequestWithAdmin } from '../../common/guards/admin.guard'
import { extractContext } from '../../common/request-context'
import { OP_LOG_RESULT } from '../../common/enums'
import { OpLogService } from '../op-log/op-log.service'

/** 默认不导出的流水表：量大且可再生，需要时勾选 */
const LOG_TABLES = new Set(['visit_log', 'admin_op_log', 'member_login_log'])

@Controller('mgmt/backup')
@UseGuards(AdminGuard)
export class MgmtBackupController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly opLog: OpLogService,
  ) {}

  /**
   * 下载备份
   * @param withLogs 是否连同访问/操作/登录日志一起导出（'1' 为是）
   */
  @Get('export')
  async export(
    @CurrentAdmin() admin: CurrentAdminInfo,
    @Query('withLogs') withLogs: string | undefined,
    @Req() req: RequestWithAdmin,
    @Res() res: Response,
  ) {
    if (!admin.isSuper) throw new ForbiddenException('仅超级管理员可导出数据备份')
    const includeLogs = withLogs === '1'
    const tables: Record<string, unknown[]> = {}
    for (const meta of this.ds.entityMetadatas) {
      if (!includeLogs && LOG_TABLES.has(meta.tableName)) continue
      // withDeleted：回收站里的内容也要备份，否则「从备份恢复」会把回收站清空
      tables[meta.tableName] = await this.ds.getRepository(meta.target).find({ withDeleted: true })
    }
    const now = new Date()
    const stamp = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace(/[-:T]/g, '')
    const body = JSON.stringify({
      format: 'zrh-backup/v1',
      exportedAt: now.toISOString(),
      exportedBy: admin.account,
      includeLogs,
      note: '不含上传文件本身（data/uploads 目录），请随数据卷一并备份',
      tables,
    })
    // @Res() 手写响应绕过统一拦截器，审计拦截器也拿不到这次操作，须自行记一条
    const ctx = extractContext(req)
    await this.opLog.write({
      adminId: admin.id, adminAccount: admin.account, adminName: admin.name,
      module: '数据备份', action: includeLogs ? '导出数据备份（含日志）' : '导出数据备份',
      method: 'GET', path: '/mgmt/backup/export', params: null, ip: ctx.ip, result: OP_LOG_RESULT.SUCCESS,
    })
    // 用 octet-stream 而非 application/json：全局异常过滤器出错时也回 200 + JSON，
    // 前端按 blob 下载时只能靠 Content-Type 区分「备份文件」与「错误信封」
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="zrh-backup-${stamp}.json"`)
    res.setHeader('Cache-Control', 'no-store')
    res.end(body)
  }
}
