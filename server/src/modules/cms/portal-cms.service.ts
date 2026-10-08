// 前台内容装配服务 —— 把栏目树与内容表组装成前台各接口需要的形状
// 前台只读，不做任何写操作；栏目有 portalPath 才对外，子栏目有内容才成为区块
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { BLOCK_LAYOUT, CONTENT_STATUS } from '../../common/enums'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import { ContentService, PORTAL_BLOCK_PAGE_SIZE } from './content.service'
import type {
  ArticleDetailVo, ArticleNavVo, BlockItemsVo, MenuNodeVo, PageBlockVo, PageContentVo, SeoConfigVo,
} from './vo/cms.vo'
import { toArticleDetailVo, toPageItemVo } from './vo/cms.vo'

/** Banner 栏目 key 前缀，约定 `banner-<页面 key>` 存该页面的头图 */
const BANNER_PREFIX = 'banner-'

/**
 * 正文就地渲染的板块形态
 * 这两种板块本身就是展开全文的，列表响应里必须带正文；
 * 其余形态（卡片/列表/标签/流程）只出标题摘要，正文留给详情页
 */
const INLINE_HTML_LAYOUTS = new Set<string>([BLOCK_LAYOUT.RICH, BLOCK_LAYOUT.VIDEO])

/** 前台文章详情页路径前缀，须与 web 路由 `/article/:id` 保持一致 */
const ARTICLE_PATH_PREFIX = '/article/'

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
    const tops = all.filter(c => !c.parentId && c.portalPath && !c.hidden)
    const nonEmpty = await this.nonEmptyChannelKeys()

    return tops.map(top => {
      const children = all
        .filter(c => c.parentId === top.id && !c.hidden && c.anchor && nonEmpty.has(c.key))
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
      if (!c.portalPath || c.hidden) continue
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
    if (!top || !top.portalPath || top.hidden) throw new NotFoundException('栏目不存在')

    const children = await this.channelRepo.find({
      where: { parentId: top.id },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const withAnchor = children.filter(c => c.anchor && !c.hidden)
    const childKeys = withAnchor.map(c => c.key)
    // 首屏每区块限条：内容随运营持续增长，不限条意味着整栏目全部条目一次下发。
    // 超出部分由 blockItems() 按页续取
    const [contents, totals] = await Promise.all([
      this.contentService.listByChannelKeys(childKeys, PORTAL_BLOCK_PAGE_SIZE),
      this.contentService.countByChannelKeys(childKeys),
    ])

    const blocks: PageBlockVo[] = []
    for (const child of withAnchor) {
      const layout = child.layout ?? BLOCK_LAYOUT.CARDS
      // 只有就地渲染正文的板块才下发正文，其余板块靠详情页取，避免整栏目全文进列表响应
      const withHtml = INLINE_HTML_LAYOUTS.has(layout)
      const items = contents
        .filter(ct => ct.channelKey === child.key)
        .map((ct, i) => toPageItemVo(ct, i, withHtml))
      // 无内容的子栏目不成为区块，避免前台渲染空白段落
      if (!items.length) continue
      const block: PageBlockVo = {
        anchor: child.anchor as string,
        heading: child.name,
        layout,
        items,
        // 前台据此判断是否还有更多；channelKey 是续取的入参
        channelKey: child.key,
        total: totals.get(child.key) ?? items.length,
        pageSize: PORTAL_BLOCK_PAGE_SIZE,
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

  /**
   * 栏目页单区块的续页条目，供前台「加载更多」
   * 校验与 articleDetail 同级：必须是对外页面下带锚点的子栏目才给数据，
   * 否则本接口等于任意栏目枚举口，Banner、首页板块这类内部栏目会被拉出来
   * @param channelKey 子栏目 key
   * @param page 页码，从 1 起
   * @param pageSize 每页条数
   */
  async blockItems(
    channelKey: string,
    page?: number,
    pageSize?: number,
    category?: string,
  ): Promise<BlockItemsVo> {
    const child = await this.channelRepo.findOne({ where: { key: channelKey } })
    if (!child?.anchor || !child.parentId || child.hidden) throw new NotFoundException('栏目不存在')

    const parent = await this.channelRepo.findOne({ where: { id: child.parentId } })
    if (!parent?.portalPath || parent.hidden) throw new NotFoundException('栏目不存在')

    const layout = child.layout ?? BLOCK_LAYOUT.CARDS
    // 正文下发口径必须与 pageContent 一致，否则续页条目会比首屏多带或少带正文
    const withHtml = INLINE_HTML_LAYOUTS.has(layout)

    const result = await this.contentService.listPagedByChannelKey(channelKey, page, pageSize, category)
    // sort 是前台展示序号，续页要接着首屏往下排，不能每页都从 1 起
    const offset = (result.page - 1) * result.pageSize
    return {
      channelKey,
      items: result.list.map((ct, i) => toPageItemVo(ct, offset + i, withHtml)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  /**
   * 文章详情：只出已发布内容，并带上所属栏目与同栏目相邻文章
   * @param id 内容 id
   */
  async articleDetail(id: number): Promise<ArticleDetailVo> {
    const content = await this.contentRepo.findOne({
      where: { id, status: CONTENT_STATUS.PUBLISHED },
    })
    // 草稿与不存在对前台是同一件事，都按 404 处理，不泄露「该 id 存在但未发布」
    if (!content) throw new NotFoundException('内容不存在')

    const channel = await this.channelRepo.findOne({ where: { key: content.channelKey } })
    // 栏目不对外（无 portalPath 的顶级栏目，或栏目已删）时不给详情页：
    // 首页板块、Banner 这类内容没有归属页面，放出详情页等于凭空多出无主地址
    if (!channel || channel.hidden) throw new NotFoundException('内容不存在')
    const parent = channel.parentId
      ? await this.channelRepo.findOne({ where: { id: channel.parentId } })
      : channel
    if (!parent?.portalPath || parent.hidden) throw new NotFoundException('内容不存在')

    const { prev, next } = await this.siblingNav(content)
    return toArticleDetailVo(content, {
      channelName: channel.name,
      parentName: parent.name,
      parentPath: parent.portalPath,
      parentKey: parent.key,
      prev,
      next,
    })
  }

  /**
   * 同栏目相邻文章
   * 排序口径与列表一致（isTop → sort → id 降序），"上一篇"指列表中更靠前的那条
   * @param content 当前内容
   */
  private async siblingNav(
    content: Content,
  ): Promise<{ prev: ArticleNavVo | null; next: ArticleNavVo | null }> {
    // 只在有正文的条目间跳转：无正文条目进不了详情（前台不给入口），
    // 跳过去就是一个空壳详情页。口径与 articleSitemapEntries 一致
    const siblings = await this.contentRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.title', 'c.name'])
      .where('c.channelKey = :key', { key: content.channelKey })
      .andWhere('c.status = :status', { status: CONTENT_STATUS.PUBLISHED })
      .andWhere("COALESCE(c.content, '') <> ''")
      .orderBy('c.isTop', 'DESC')
      .addOrderBy('c.sort', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .getMany()
    const index = siblings.findIndex(s => s.id === content.id)
    if (index < 0) return { prev: null, next: null }
    const toNav = (c: Content | undefined): ArticleNavVo | null =>
      c ? { id: c.id, title: c.title || c.name || '' } : null
    return { prev: toNav(siblings[index - 1]), next: toNav(siblings[index + 1]) }
  }

  /** 页面头图：取 `banner-<页面 key>` 栏目下第一条内容的封面 */
  async bannerImage(pageKey: string): Promise<string | undefined> {
    const banner = await this.contentRepo.findOne({
      where: { channelKey: `${BANNER_PREFIX}${pageKey}`, status: CONTENT_STATUS.PUBLISHED },
      order: { sort: 'DESC', id: 'DESC' },
    })
    return banner?.cover || undefined
  }

  /**
   * 站点地图条目：首页 + 全部对外栏目页
   * 只出相对路径与更新时间，绝对 URL 由控制器按站点域名拼接。
   * 与 menu() 的口径一致（须有 portalPath），但不要求栏目下有内容——
   * 空栏目页仍是可访问的真实地址，对搜索引擎该收录
   */
  async sitemapEntries(): Promise<Array<{ path: string; lastmod: Date }>> {
    const tops = await this.channelRepo.find({
      where: { parentId: IsNull() },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const pages = tops.filter(c => c.portalPath && !c.hidden)

    // 首页不对应任何栏目，单独补一条；更新时间取各栏目里最新的一个，
    // 首页内容本就由多个 home-* 栏目拼成，取最大值比写死当前时间更贴近实际
    const latest = pages.reduce<Date | null>(
      (acc, c) => (!acc || c.updatedAt > acc ? c.updatedAt : acc),
      null,
    )
    const entries: Array<{ path: string; lastmod: Date }> = [
      { path: '/', lastmod: latest ?? new Date() },
    ]
    for (const c of pages) {
      entries.push({ path: c.portalPath as string, lastmod: c.updatedAt })
    }
    // 隐私政策页是前台固定路由、不对应栏目，更新时间沿用首页口径
    entries.push({ path: '/privacy', lastmod: latest ?? new Date() })
    entries.push(...(await this.articleSitemapEntries(tops)))
    return entries
  }

  /**
   * 有正文的已发布内容的详情页地址
   * 口径必须与 articleDetail() 的放行条件一致：内容已发布、有正文、
   * 且所属栏目能上溯到一个配了 portalPath 的顶级栏目。否则 sitemap 里会出现 404 地址
   * @param tops 全部顶级栏目，复用调用方已查到的结果，避免重复查库
   */
  private async articleSitemapEntries(tops: Channel[]): Promise<Array<{ path: string; lastmod: Date }>> {
    const portalTopIds = new Set(tops.filter(c => c.portalPath && !c.hidden).map(c => c.id))
    const all = await this.channelRepo.find()
    // 能上溯到对外顶级栏目的栏目 key（顶级栏目自身也算）
    const reachable = new Set(
      all
        .filter(c => !c.hidden && (c.parentId ? portalTopIds.has(c.parentId) : portalTopIds.has(c.id)))
        .map(c => c.key),
    )
    if (!reachable.size) return []

    const rows = await this.contentRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.updatedAt'])
      .where('c.channelKey IN (:...keys)', { keys: [...reachable] })
      .andWhere('c.status = :status', { status: CONTENT_STATUS.PUBLISHED })
      .andWhere("COALESCE(c.content, '') <> ''")
      .getMany()

    return rows.map(r => ({ path: `${ARTICLE_PATH_PREFIX}${r.id}`, lastmod: r.updatedAt }))
  }

  /**
   * 有内容记录的栏目 key 集合，用于过滤空区块与空菜单项
   * 只算已发布：全是草稿的栏目对前台等同于空栏目，不该出菜单项
   */
  private async nonEmptyChannelKeys(): Promise<Set<string>> {
    const rows = await this.contentRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.channelKey', 'channelKey')
      .where('c.status = :status', { status: CONTENT_STATUS.PUBLISHED })
      .getRawMany<{ channelKey: string }>()
    return new Set(rows.map(r => r.channelKey))
  }
}
