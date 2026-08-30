// 后台注册登录配置接口 —— /api/mgmt/auth-config/*
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { AuthConfigService } from './auth-config.service'
import { MgmtDevGuard } from '../../common/guards/mgmt-dev.guard'
import { raw } from '../../common/interceptors/transform.interceptor'
import { UpdateAuthConfigDto } from './dto/auth-config.dto'

@Controller('mgmt/auth-config')
@UseGuards(MgmtDevGuard)
export class MgmtAuthConfigController {
  constructor(private readonly service: AuthConfigService) {}

  /** 读取配置 */
  @Get()
  get() {
    return this.service.get()
  }

  /** 更新配置，保存后即时生效 */
  @Put()
  async update(@Body() dto: UpdateAuthConfigDto) {
    const saved = await this.service.update(dto)
    return raw(saved, '保存成功')
  }
}
