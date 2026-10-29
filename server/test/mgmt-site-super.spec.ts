// 基本信息保存仅限超管：普通管理员即便绕过前端直接调接口也改不了全站配置；读取仍对所有管理员开放
import { ForbiddenException } from '@nestjs/common'
import type { CurrentAdminInfo } from '../src/common/guards/admin.guard'
import { MgmtSiteController } from '../src/modules/cms/mgmt-site.controller'
import type { SiteConfigService } from '../src/modules/cms/site-config.service'
import type { SaveSiteConfigDto } from '../src/modules/cms/dto/site-config.dto'

const normal: CurrentAdminInfo = { id: 2, account: 'editor', name: '编辑', perms: ['新闻资讯'], isSuper: false }
const superAdmin: CurrentAdminInfo = { id: 1, account: 'admin', name: '超管', perms: [], isSuper: true }

describe('MgmtSiteController 权限', () => {
  const service = { save: jest.fn().mockResolvedValue(undefined), getForAdmin: jest.fn().mockResolvedValue({ website: 'x' }) }
  const ctrl = new MgmtSiteController(service as unknown as SiteConfigService)
  const dto = { companyName: '改名' } as SaveSiteConfigDto

  beforeEach(() => jest.clearAllMocks())

  it('普通管理员保存被拒，且不落库', async () => {
    await expect(ctrl.save(dto, normal)).rejects.toThrow(ForbiddenException)
    await expect(ctrl.save(dto, normal)).rejects.toThrow('仅超级管理员可修改基本信息')
    expect(service.save).not.toHaveBeenCalled()
  })

  it('超管可以保存', async () => {
    await ctrl.save(dto, superAdmin)
    expect(service.save).toHaveBeenCalledWith(dto)
  })

  it('读取不限超管：顶栏「进入网站」要用网址', async () => {
    await expect(ctrl.detail()).resolves.toEqual({ website: 'x' })
  })
})
