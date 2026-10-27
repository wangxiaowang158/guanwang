// 站内搜索 —— 在前台可达的已发布内容里按关键词查找
//
// 为什么不上全文检索引擎：内容总量百~千级，LIKE 扫一遍毫秒级；
// 引入 ES / Meilisearch 要多起一个服务、多一套同步，收益抵不上运维成本。
// 中文不做分词：LIKE 子串匹配对「节能」「锅炉」这类短词本就是对的
//
// 可达口径与 articleDetail / sitemap 一致：栏目未隐藏、能上溯到配了 portalPath 的顶级栏目；
// Banner、首页板块这类没有归属页面的内容不进结果，免得搜出来点进去是 404
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CONTENT_STATUS } from '../../common/enums'
import { htmlToText } from '../../common/utils/html-to-text'
import { resolvePaging } from '../../common/pagination'
import { Channel } from './channel.entity'
import { Content } from './content.entity'

/** 单条搜索结果 */
export interface SearchHitVo {
  id: number
  title: string
  /** 命中处附近的一段纯文本摘要 */
  snippet: string
  /** 所属页面名，结果里作为来源标签 */
  pageName: string
  /** 站内地址：有正文进详情页，否则落到所属页面的区块锚点 */
  path: string
  cover?: string
  date?: string
}

export interface SearchResultVo {
  keyword: string
  list: SearchHitVo[]
  total: number
  page: number
  pageSize: number
}

/** 关键词长度上限：再长就不是「搜索」而是粘了一段话进来 */
export const SEARCH_KEYWORD_MAX = 50

/** 摘要长度 */
const SNIPPET_LEN = 90

/** 单次匹配的候选上限：防止「的」这类高频字把整表拉进内存做摘要 */
const CANDIDATE_MAX = 500

/** Banner 栏目前缀，与 portal-cms.service 一致 */
const BANNER_PREFIX = 'banner-'

/** 页面在栏目树上的位置 */
interface ChannelPlace {
  pageName: string
  pagePath: string
  anchor: string | null
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
  ) {}

  /**
   * 搜索
   * @param rawKeyword 关键词，前后空白会被去掉
   */
  async search(rawKeyword: string, page?: number, pageSize?: number): Promise<SearchResultVo> {
    const keyword = (rawKeyword || '').trim().slice(0, SEARCH_KEYWORD_MAX)
    const paging = resolvePaging(page, pageSize, { defaultSize: 10, maxSize: 30 })
    const empty = { keyword, list: [], total: 0, page: paging.page, pageSize: paging.pageSize }
    if (!keyword) return empty

    const places = await this.reachableChannels()
    if (!places.size) return empty

    // LIKE 通配符转义：用户搜「100%」不该匹配成「100 后面任意」。
    // 转义符用 ! 而非反斜杠：MySQL 字符串字面量里 '\' 本身是转义符，写成 ESCAPE '\' 会语法错误，sqlite 又不认 '\\'
    const kw = `%${keyword.replace(/[!%_]/g, m => `!${m}`)}%`
    const rows = await this.contentRepo
      .createQueryBuilder('c')
      // 候选不取正文：高频字可命中上百条，全量富文本拉进内存会到十几 MB；当前页的正文下面再按 id 补查
      .select(['c.id', 'c.channelKey', 'c.title', 'c.name', 'c.description', 'c.cover', 'c.publishAt', 'c.createdAt'])
      .where('c.channelKey IN (:...keys)', { keys: [...places.keys()] })
      .andWhere('c.status = :status', { status: CONTENT_STATUS.PUBLISHED })
      .andWhere(
        "(c.title LIKE :kw ESCAPE '!' OR c.name LIKE :kw ESCAPE '!' OR c.description LIKE :kw ESCAPE '!' OR c.content LIKE :kw ESCAPE '!')",
        { kw },
      )
      .orderBy('COALESCE(c.publishAt, c.createdAt)', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .take(CANDIDATE_MAX)
      .getMany()

    // 标题命中的排前面：用户搜的多半是标题里的词，正文里顺带提到的往后放
    const lower = keyword.toLowerCase()
    const titleOf = (c: Content) => c.title || c.name || ''
    const ranked = [
      ...rows.filter(c => titleOf(c).toLowerCase().includes(lower)),
      ...rows.filter(c => !titleOf(c).toLowerCase().includes(lower)),
    ]
    const pageRows = ranked.slice(paging.skip, paging.skip + paging.pageSize)
    const bodies = new Map<number, string>()
    if (pageRows.length) {
      const withBody = await this.contentRepo.find({ select: ['id', 'content'], where: { id: In(pageRows.map(c => c.id)) } })
      for (const r of withBody) bodies.set(r.id, htmlToText(r.content))
    }
    const list = pageRows.map(c => {
      const place = places.get(c.channelKey) as ChannelPlace
      const bodyText = bodies.get(c.id) ?? ''
      const hasBody = !!bodyText.trim()
      const date = c.publishAt ?? c.createdAt
      const hit: SearchHitVo = {
        id: c.id,
        title: titleOf(c),
        snippet: snippetOf(c.description || bodyText, keyword),
        pageName: place.pageName,
        path: hasBody ? `/article/${c.id}` : place.anchor ? `${place.pagePath}#${place.anchor}` : place.pagePath,
      }
      if (c.cover) hit.cover = c.cover
      if (date) hit.date = new Date(date).toISOString().slice(0, 10)
      return hit
    })
    return { keyword, list, total: ranked.length, page: paging.page, pageSize: paging.pageSize }
  }

  /** 前台可达的栏目 key → 所在页面；顶级页面本身也算（单页型栏目内容挂在顶级上） */
  private async reachableChannels(): Promise<Map<string, ChannelPlace>> {
    const all = await this.channelRepo.find()
    const tops = new Map(
      all.filter(c => !c.parentId && c.portalPath && !c.hidden).map(c => [c.id, c]),
    )
    const result = new Map<string, ChannelPlace>()
    for (const c of all) {
      if (c.hidden || c.key.startsWith(BANNER_PREFIX)) continue
      const top = c.parentId ? tops.get(c.parentId) : tops.get(c.id)
      // 首页板块（业绩数字、伙伴 Logo、核心优势…）是各栏目页内容的策划摘录，搜出来只会和正主重复，不纳入
      if (!top || top.portalPath === '/') continue
      result.set(c.key, { pageName: top.name, pagePath: top.portalPath as string, anchor: c.parentId ? c.anchor : null })
    }
    return result
  }
}

/**
 * 命中处前后截一段作摘要；没命中（只在标题里）就取开头
 * @param text 纯文本
 */
export function snippetOf(text: string, keyword: string): string {
  const flat = (text || '').replace(/\s+/g, ' ').trim()
  if (flat.length <= SNIPPET_LEN) return flat
  const at = flat.toLowerCase().indexOf(keyword.toLowerCase())
  if (at < 0) return `${flat.slice(0, SNIPPET_LEN)}…`
  const start = Math.max(0, at - Math.floor((SNIPPET_LEN - keyword.length) / 2))
  const end = Math.min(flat.length, start + SNIPPET_LEN)
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`
}
