// 前台内容装配服务 —— 把栏目树与内容表组装成前台各接口需要的形状
// 前台只读，不做任何写操作；栏目有 portalPath 才对外，子栏目有内容才成为区块
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { BLOCK_LAYOUT } from '../../common/enums'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import { ContentService } from './content.service'
import type { MenuNodeVo, PageBlockVo, PageContentVo, SeoConfigVo } from './vo/cms.vo'
import { toPageItemVo } from './vo/cms.vo'

/** Banner 栏目 key 前缀，约定 `banner-<页面 key>` 存该页面的头图 */
const BANNER_PREFIX = 'banner-'

@Injectable()
export class PortalCmsService {
  constructor(
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
    private readonly contentService: ContentService,
  ) {}

  /** 前台导航菜单树：只含配了 portalPath 的顶级栏目，及其有内容的子栏目 */
  async menu(): Promise<MenuNodeVo[]> {
    const all = await this.channelRepo.find({ order: { sort: 'ASC', id: 'ASC' } })
    const tops = all.filter(c => !c.parentId && c.portalPath)
    const nonEmpty = await this.nonEmptyChannelKeys()

    return tops.map(top => {
      const children = all
        .filter(c => c.parentId === top.id && c.anchor && nonEmpty.has(c.key))
        .map<MenuNodeVo>(c => ({
          key: c.key,
          label: c.name,
          path: top.portalPath as string,
          anchor: c.anchor as string,
        }))
      const node: MenuNodeVo = { key: top.key, label: top.name, path: top.portalPath as string }
      if (children.length) node.children = children
      return node
    })
  }

  /** 全部栏目页 SEO 配置，键为顶级栏目 key */
  async seoConfigs(): Promise<Record<string, SeoConfigVo>> {
    const tops = await this.channelRepo.find({
      where: { parentId: IsNull() },
      order: { sort: 'ASC' },
    })
    const result: Record<string, SeoConfigVo> = {}
    for (const c of tops) {
      if (!c.portalPath) continue
      result[c.key] = {
        title: c.seoTitle ?? '',
        keywords: c.seoKeywords ?? '',
        description: c.seoDescription ?? '',
      }
    }
    return result
  }

  /**
   * 单个栏目页内容：Hero 取顶级栏目自身字段，区块由子栏目 + 其内容组装
   * @param key 顶级栏目标识
   */
  async pageContent(key: string): Promise<PageContentVo> {
    const top = await this.channelRepo.findOne({ where: { key } })
    if (!top || !top.portalPath) throw new NotFoundException('栏目不存在')

    const children = await this.channelRepo.find({
      where: { parentId: top.id },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const withAnchor = children.filter(c => c.anchor)
    const contents = await this.contentService.listByChannelKeys(withAnchor.map(c => c.key))

    const blocks: PageBlockVo[] = []
    for (const child of withAnchor) {
      const items = contents
        .filter(ct => ct.channelKey === child.key)
        .map((ct, i) => toPageItemVo(ct, i))
      // 无内容的子栏目不成为区块，避免前台渲染空白段落
      if (!items.length) continue
      const block: PageBlockVo = {
        anchor: child.anchor as string,
        heading: child.name,
        layout: child.layout ?? BLOCK_LAYOUT.CARDS,
        items,
      }
      if (child.subheading) block.subheading = child.subheading
      blocks.push(block)
    }

    const bg = await this.bannerImage(key)
    const hero: PageContentVo['hero'] = {
      eyebrow: top.heroEyebrow ?? '',
      title: top.heroTitle ?? top.name,
      desc: top.heroDesc ?? '',
    }
    if (bg) hero.bg = bg

    return { key: top.key, hero, blocks }
  }

  /** 页面头图：取 `banner-<页面 key>` 栏目下第一条内容的封面 */
  async bannerImage(pageKey: string): Promise<string | undefined> {
    const banner = await this.contentRepo.findOne({
      where: { channelKey: `${BANNER_PREFIX}${pageKey}` },
      order: { sort: 'DESC', id: 'DESC' },
    })
    return banner?.cover || undefined
  }

  /** 有内容记录的栏目 key 集合，用于过滤空区块与空菜单项 */
  private async nonEmptyChannelKeys(): Promise<Set<string>> {
    const rows = await this.contentRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.channelKey', 'channelKey')
      .getRawMany<{ channelKey: string }>()
    return new Set(rows.map(r => r.channelKey))
  }
}
