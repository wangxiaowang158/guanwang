// 站点信息服务 —— 单例行，首次读取时自动建行，避免前台在未初始化时拿到空响应
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { SaveSiteConfigDto } from './dto/site-config.dto'
import { SiteConfig } from './site-config.entity'
import {
  normalizeFooterConfig, normalizeHomeLayout, type FooterConfig, type HomeSectionConfig,
} from '../../common/site-layout'
import { normalizeSiteExt, toPublicSiteExt, type PublicSiteExt, type SiteExtConfig } from '../../common/site-ext'

/** 不直接外露的列：主键、更新时间，以及另行还原的 JSON 列 */
type InternalKeys = 'id' | 'updatedAt' | 'homeLayout' | 'footerConfig' | 'extConfig'

/** 普通字段 + 还原成对象的布局类 JSON 列 */
type BaseSiteConfig = Omit<SiteConfig, InternalKeys> & {
  homeLayout: HomeSectionConfig[]
  footerConfig: FooterConfig
}

/** 对外站点信息 */
export type PublicSiteConfig = BaseSiteConfig & { ext: PublicSiteExt }

/** 后台站点信息：扩展配置给完整结构 */
export type AdminSiteConfig = BaseSiteConfig & { extConfig: SiteExtConfig }

/** 单例行固定主键 */
const SINGLETON_ID = 1

/** 实体里允许 NULL 的普通列（homeLayout / footerConfig / extConfig 另行处理），须与 site-config.entity.ts 一致 */
const NULLABLE_COLUMNS = new Set<string>(['heroImage', 'heroVideo'])

@Injectable()
export class SiteConfigService {
  constructor(@InjectRepository(SiteConfig) private readonly repo: Repository<SiteConfig>) {}

  /** 读取站点信息，不存在时创建一行默认值 */
  async get(): Promise<SiteConfig> {
    const found = await this.repo.findOne({ where: { id: SINGLETON_ID } })
    if (found) return found
    return this.repo.save(this.repo.create({ id: SINGLETON_ID }))
  }

  /** 扩展配置（已净化） */
  async getExt(): Promise<SiteExtConfig> {
    return normalizeSiteExt((await this.get()).extConfig)
  }

  /**
   * 读取对外展示的站点信息：去掉主键与更新时间这类内部字段
   * 扩展配置只下发前台用得到的部分（统计 ID、灰色模式是否生效、悬浮条），水印等上传侧配置不外露
   */
  async getPublic(): Promise<PublicSiteConfig> {
    const { base, ext } = await this.split()
    return { ...base, ext: toPublicSiteExt(ext) }
  }

  /** 后台读取：扩展配置给完整结构，供编辑回填 */
  async getForAdmin(): Promise<AdminSiteConfig> {
    const { base, ext } = await this.split()
    return { ...base, extConfig: ext }
  }

  /** 拆出普通字段与扩展配置；JSON 列出库也过净化，库里若有手工改坏的值，拿到的仍是形态确定的对象 */
  private async split(): Promise<{ base: BaseSiteConfig; ext: SiteExtConfig }> {
    const config: Partial<SiteConfig> = { ...(await this.get()) }
    const homeLayout = normalizeHomeLayout(config.homeLayout)
    const footerConfig = normalizeFooterConfig(config.footerConfig)
    const ext = normalizeSiteExt(config.extConfig)
    delete config.id
    delete config.updatedAt
    delete config.homeLayout
    delete config.footerConfig
    delete config.extConfig
    return { base: { ...(config as Omit<SiteConfig, InternalKeys>), homeLayout, footerConfig }, ext }
  }

  /** 保存站点信息，只覆盖传过来的字段 */
  async save(dto: SaveSiteConfigDto): Promise<void> {
    const entity = await this.get()
    // DTO 字段与实体同名同型，且已由全局 ValidationPipe 白名单过滤，可整体合并
    const { homeLayout, footerConfig, extConfig, ...plain } = dto
    // null 视同「清空」：IsOptional 会放行 null，而除少数可空列外其余都是 NOT NULL，
    // 原样写入会触发约束报 500。可空列保留 null 语义，其余转空串
    const patch = Object.fromEntries(
      Object.entries(plain)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, v === null && !NULLABLE_COLUMNS.has(k) ? '' : v]),
    ) as Partial<SiteConfig>
    // JSON 列经白名单净化后入库；null 或空数组即恢复默认（存 null）
    if (homeLayout !== undefined) {
      patch.homeLayout = homeLayout?.length ? JSON.stringify(normalizeHomeLayout(homeLayout)) : null
    }
    if (footerConfig !== undefined) {
      patch.footerConfig = footerConfig ? JSON.stringify(normalizeFooterConfig(footerConfig)) : null
    }
    if (extConfig !== undefined) {
      patch.extConfig = extConfig ? JSON.stringify(normalizeSiteExt(extConfig)) : null
    }
    await this.repo.save(this.repo.merge(entity, patch))
  }
}
