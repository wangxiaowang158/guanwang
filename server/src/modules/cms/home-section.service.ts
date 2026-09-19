// 首页板块装配服务 —— 把 home-* 子栏目的内容映射成前台首页各板块的形状
// 各板块字段形状不同，共用 content 宽表的不同列，映射关系集中在本文件，改前台只改这里
import { Injectable } from '@nestjs/common'
import { ContentService } from './content.service'
import type { Content } from './content.entity'
import { PortalCmsService } from './portal-cms.service'

/** 首页各板块对应的栏目 key */
export const HOME_SECTION_KEYS = {
  ABOUT: 'home-intro',
  PHILOSOPHY: 'home-philosophy',
  BUSINESS: 'home-business',
  PRODUCT: 'home-product',
  SERVICE: 'home-service',
  PARTNER: 'home-customer',
  ACHIEVEMENT: 'home-achievement',
  SOCIAL: 'home-social',
} as const

/** 单条文本板块 */
interface SingleSection {
  title: string
  subtitle?: string
  content: string
}

@Injectable()
export class HomeSectionService {
  constructor(
    private readonly contentService: ContentService,
    private readonly portalCms: PortalCmsService,
  ) {}

  /** 首页全部板块聚合数据 */
  async sections(): Promise<Record<string, unknown>> {
    const keys = Object.values(HOME_SECTION_KEYS)
    const all = await this.contentService.listByChannelKeys(keys)
    const pick = (key: string) => all.filter(c => c.channelKey === key)
    const heroBg = await this.portalCms.bannerImage('home')

    return {
      about: this.toSingle(pick(HOME_SECTION_KEYS.ABOUT)[0]),
      philosophy: this.toSingle(pick(HOME_SECTION_KEYS.PHILOSOPHY)[0]),
      business: pick(HOME_SECTION_KEYS.BUSINESS).map((c, i) => this.toBusiness(c, i)),
      products: pick(HOME_SECTION_KEYS.PRODUCT).map((c, i) => this.toProduct(c, i)),
      services: pick(HOME_SECTION_KEYS.SERVICE).map((c, i) => this.toService(c, i)),
      partners: pick(HOME_SECTION_KEYS.PARTNER).map((c, i) => this.toPartner(c, i)),
      achievements: pick(HOME_SECTION_KEYS.ACHIEVEMENT).map((c, i) => this.toAchievement(c, i)),
      social: pick(HOME_SECTION_KEYS.SOCIAL).map((c, i) => this.toSocial(c, i)),
      // 板块背景图：目前仅首屏 Hero 有配置项，取自「首页 Banner」栏目
      backgrounds: heroBg ? { hero: heroBg } : {},
    }
  }

  /** 单条文本板块：正文优先取 content，其次 description */
  private toSingle(c?: Content): SingleSection {
    if (!c) return { title: '', content: '' }
    const section: SingleSection = {
      title: c.title ?? '',
      content: c.content ?? c.description ?? '',
    }
    if (c.subtitle) section.subtitle = c.subtitle
    return section
  }

  /** 业务与行业项：图标 + 标题 + 说明 */
  private toBusiness(c: Content, index: number) {
    return {
      id: c.id,
      icon: c.icon ?? '',
      title: c.title ?? '',
      desc: c.description ?? c.intro ?? '',
      sort: this.displaySort(index),
    }
  }

  /** 主要产品项：特性列表按换行拆分自 content */
  private toProduct(c: Content, index: number) {
    return {
      id: c.id,
      name: c.name ?? c.title ?? '',
      summary: c.subtitle ?? c.description ?? '',
      features: this.splitLines(c.content),
      image: c.cover ?? '',
      sort: this.displaySort(index),
    }
  }

  /** 技术服务项：前台不排序，但保留 sort 以便后台调整顺序 */
  private toService(c: Content, index: number) {
    return {
      id: c.id,
      icon: c.icon ?? '',
      title: c.title ?? '',
      desc: c.description ?? '',
      sort: this.displaySort(index),
    }
  }

  /** 合作伙伴项：Logo 取白底图，回退封面图 */
  private toPartner(c: Content, index: number) {
    return {
      id: c.id,
      name: c.title ?? c.name ?? '',
      logo: c.whiteCover ?? c.cover ?? '',
      link: c.link ?? '',
      sort: this.displaySort(index),
    }
  }

  /** 公司业绩项：数值存 title，单位存 subtitle，说明存 description */
  private toAchievement(c: Content, index: number) {
    return {
      id: c.id,
      value: Number.parseInt(c.title ?? '', 10) || 0,
      suffix: c.subtitle ?? '',
      label: c.description ?? '',
      sort: this.displaySort(index),
    }
  }

  /** 社会贡献项 */
  private toSocial(c: Content, index: number) {
    return {
      id: c.id,
      title: c.title ?? '',
      desc: c.description ?? '',
      image: c.cover ?? '',
      sort: this.displaySort(index),
    }
  }

  /**
   * 前台按 sort 升序展示，而库里按 sort 降序取出（与管理端列表一致）
   * 此处按取出顺序重新编号，保证前台顺序与后台看到的顺序一致
   */
  private displaySort(index: number): number {
    return index + 1
  }

  /** 富文本按行拆成数组，空行丢弃 */
  private splitLines(raw: string | null): string[] {
    if (!raw) return []
    return raw
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
  }
}
