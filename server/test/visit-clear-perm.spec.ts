// 访问日志清理权限 —— 与登录日志、操作日志同口径，只许超管清理
// 盯两件事：非超管被拒且不触达删除；超管正常清理并回带条数
import { ForbiddenException } from '@nestjs/common'
import { MgmtVisitStatsController } from '../src/modules/visit/mgmt-visit-stats.controller'
import type { VisitService } from '../src/modules/visit/visit.service'
import type { CurrentAdminInfo } from '../src/common/guards/admin.guard'

const admin = (isSuper: boolean): CurrentAdminInfo => ({
  id: 2,
  account: 'editor',
  name: '编辑',
  perms: ['访问统计'],
  isSuper,
})

describe('MgmtVisitStatsController.clear', () => {
  it('非超管即使有访问统计权限也被拒绝，且不执行删除', async () => {
    const clearBefore = jest.fn()
    const ctrl = new MgmtVisitStatsController({ clearBefore } as unknown as VisitService)
    await expect(ctrl.clear(admin(false), { before: '2026-01-01' })).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    expect(clearBefore).not.toHaveBeenCalled()
  })

  it('超管可清理，返回清理条数', async () => {
    const clearBefore = jest.fn().mockResolvedValue(3)
    const ctrl = new MgmtVisitStatsController({ clearBefore } as unknown as VisitService)
    const res = await ctrl.clear(admin(true), { before: '2026-01-01' })
    expect(clearBefore).toHaveBeenCalledWith('2026-01-01')
    expect(JSON.stringify(res)).toContain('已清理 3 条访问日志')
  })
})
