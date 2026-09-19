// 站点信息服务 —— 单例行，首次读取时自动建行，避免前台在未初始化时拿到空响应
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { SaveSiteConfigDto } from './dto/site-config.dto'
import { SiteConfig } from './site-config.entity'

/** 单例行固定主键 */
const SINGLETON_ID = 1

@Injectable()
export class SiteConfigService {
  constructor(@InjectRepository(SiteConfig) private readonly repo: Repository<SiteConfig>) {}

  /** 读取站点信息，不存在时创建一行默认值 */
  async get(): Promise<SiteConfig> {
    const found = await this.repo.findOne({ where: { id: SINGLETON_ID } })
    if (found) return found
    return this.repo.save(this.repo.create({ id: SINGLETON_ID }))
  }

  /** 保存站点信息，只覆盖传过来的字段 */
  async save(dto: SaveSiteConfigDto): Promise<void> {
    const entity = await this.get()
    // DTO 字段与实体同名同型，且已由全局 ValidationPipe 白名单过滤，可整体合并
    const patch = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Partial<SiteConfig>
    await this.repo.save(this.repo.merge(entity, patch))
  }
}
