// 首页板块装配服务 —— 把 home-* 子栏目的内容映射成前台首页各板块的形状
// 各板块字段形状不同，共用 content 宽表的不同列，映射关系集中在本文件，改前台只改这里
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Channel } from './channel.entity'
import { ContentService } from './content.service'
import type { Content } from './content.entity'
import { PortalCmsService } from './portal-cms.service'
import { safeLink } from './vo/cms.vo'
import { htmlToText } from '../../common/utils/html-to-text'

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
  VIEW: 'home-view',
} as const

/** 板块标题：小标题取栏目名，主标题取栏目的区块副标题；前台为空时用内置文案 */
interface SectionHeading {
  eyebrow: string
  title: string
}

/**
 * 每个首页板块最多取几条
 * 首页各板块是人工策划位，版式固定且页面上没有翻页的位置，故只设安全上限、不做分页。
 * 取 24 是现有各板块最多条数（6 条）的 4 倍——够宽松，不会影响正常运营，
 * 只在栏目被误当成列表页灌进成百条时挡住整表下发
 */
const HOME_SECTION_MAX_ITEMS = 24

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
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
  ) {}

  /**
   * 各板块标题，按前台板块标识归档
   * 板块标识沿用前台既有命名（about / business …），与栏目 key 解耦：前台不必知道栏目 key
   */
  private async headings(): Promise<Record<string, SectionHeading>> {
    const map: Record<string, string> = {
      about: HOME_SECTION_KEYS.ABOUT,
      business: HOME_SECTION_KEYS.BUSINESS,
      product: HOME_SECTION_KEYS.PRODUCT,
      service: HOME_SECTION_KEYS.SERVICE,
      philosophy: HOME_SECTION_KEYS.PHILOSOPHY,
      achievement: HOME_SECTION_KEYS.ACHIEVEMENT,
      partner: HOME_SECTION_KEYS.PARTNER,
      view: HOME_SECTION_KEYS.VIEW,
      social: HOME_SECTION_KEYS.SOCIAL,
    }
    const channels = await this.channelRepo.find({ where: { key: In(Object.values(map)) } })
    const byKey = new Map(channels.map(c => [c.key, c]))
    const result: Record<string, SectionHeading> = {}
    for (const [section, key] of Object.entries(map)) {
      const ch = byKey.get(key)
      if (ch && !ch.hidden) result[section] = { eyebrow: ch.name ?? '', title: ch.subheading ?? '' }
    }
    return result
  }

  /** 首页全部板块聚合数据 */
  async sections(): Promise<Record<string, unknown>> {
    // 被隐藏的板块不取数：pick 对其返回空，前台按「该板块没有内容」处理
    const hiddenRows = await this.channelRepo.find({
      where: { key: In(Object.values(HOME_SECTION_KEYS)), hidden: true },
    })
    const hiddenKeys = new Set(hiddenRows.map(c => c.key))
    const keys = Object.values(HOME_SECTION_KEYS).filter(k => !hiddenKeys.has(k))
    const all = keys.length ? await this.contentService.listByChannelKeys(keys, HOME_SECTION_MAX_ITEMS) : []
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
      views: pick(HOME_SECTION_KEYS.VIEW).map((c, i) => this.toView(c, i)),
      headings: await this.headings(),
      // 板块背景图：目前仅首屏 Hero 有配置项，取自「首页 Banner」栏目
      backgrounds: heroBg ? { hero: heroBg } : {},
    }
  }

  /**
   * 单条文本板块：正文优先取 content，其次 description
   * content 来自富文本编辑器，转成保留换行的纯文本；用 || 而非 ??，
   * 正文被清成空串时也能回落到 description
   */
  private toSingle(c?: Content): SingleSection {
    if (!c) return { title: '', content: '' }
    const section: SingleSection = {
      title: c.title ?? '',
      content: htmlToText(c.content) || c.description || '',
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

  /** 「我眼中的中瑞恒」项：媒体报道、行业评价等；链接只放行 http(s)，挡掉 javascript: 伪协议 */
  private toView(c: Content, index: number) {
    return {
      id: c.id,
      title: c.title ?? '',
      desc: c.description ?? '',
      image: c.cover ?? '',
      link: safeLink(c.link) ?? '',
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

  /** 富文本按块拆成数组：每个段落/列表项/换行为一项，空行丢弃 */
  private splitLines(raw: string | null): string[] {
    return htmlToText(raw).split('\n').filter(Boolean)
  }
}
