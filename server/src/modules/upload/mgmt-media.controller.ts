// 后台素材库接口 —— /api/mgmt/media/*
//
// 权限按操作分两档，不是整个控制器一刀切：
// - 列表仅要求登录：内容编辑页的「选择已有素材」要用它，而能编辑内容的账号
//   未必有素材库菜单权限；一刀切会让那个按钮对多数账号直接 403。
//   它只暴露自己上传目录里的文件名与体积，与上传能力同级。
// - 删除要求素材库权限：删文件不可撤销，且能删掉别人正在用的素材，
//   属独立管理职能，必须单独授权。
import { Body, Controller, Delete, Get, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../../common/guards/admin.guard'
import { PermGuard } from '../../common/guards/perm.guard'
import { PERM, RequirePerm } from '../../common/decorators/require-perm.decorator'
import { MediaQueryDto, RemoveMediaDto } from './dto/media.dto'
import { MediaService } from './media.service'

@Controller('mgmt/media')
@UseGuards(AdminGuard)
export class MgmtMediaController {
  constructor(private readonly service: MediaService) {}

  /** 素材分页列表，附带整体统计；仅要求登录，供内容编辑页选用已有素材 */
  @Get('list')
  async list(@Query() query: MediaQueryDto) {
    return this.service.list(query)
  }

  /**
   * 删除素材，需素材库权限
   * 用 DELETE + 请求体而非路径参数：素材标识是含斜杠的完整路径，
   * 塞进路径段要额外编码，编码/解码任一处不一致就会删错文件
   */
  @Delete('delete')
  @UseGuards(PermGuard)
  @RequirePerm(PERM.MEDIA_LIBRARY)
  async remove(@Body() dto: RemoveMediaDto) {
    return this.service.remove(dto.url)
  }
}
