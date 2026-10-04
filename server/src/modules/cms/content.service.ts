// 内容服务 —— 按栏目 key 组织的内容增删改查
// 一张宽表存所有栏目内容，各栏目按自己的 formFields 取用字段
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository, type FindOptionsWhere } from 'typeorm'
import { sanitizeRichText } from '../../common/html-sanitizer'
import { CONTENT_STATUS, type ContentStatus } from '../../common/enums'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import type { SaveContentDto } from './dto/content.dto'
import { formatDateTime } from './vo/cms.vo'
import { resolvePaging, type PageResult } from '../../common/pagination'

/** 可写文本字段，空串按清空处理 */
const TEXT_FIELDS = [
  'title', 'name', 'subtitle', 'keywords', 'description', 'intro', 'content',
  'cover', 'video', 'whiteCover', 'file', 'link', 'category', 'icon', 'brand', 'author', 'source',
] as const

/** 后台列表默认每页条数，与前端分页器初值一致 */
const DEFAULT_PAGE_SIZE = 10

/** 每页条数上限，挡住 pageSize=99999 这类等效全量拉取 */
const MAX_PAGE_SIZE = 100

/**
 * 前台单个栏目区块首屏条数
 * 取 12 而非 10：现有各区块最多 6 条，12 能让所有页面首屏一次出全，
 * 同时给内容增长留出缓冲，不至于一发布新闻就触发翻页
 */
export const PORTAL_BLOCK_PAGE_SIZE = 12

/** 前台区块每页条数上限，与后台列表同口径 */
const PORTAL_MAX_PAGE_SIZE = 100

/**
 * 前台排序：置顶优先，其次人工排序值，最后按 id 倒序
 * 抽成常量供批量查询与分页查询共用 —— 两处排序必须完全一致，
 * 否则「加载更多」取到的第二页会与首屏重叠或漏条
 */
const PORTAL_ORDER = { isTop: 'DESC', sort: 'DESC', id: 'DESC' } as const

/** 后台内容列表的分页结果 */
export type ContentPage = PageResult<Content>

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content) private readonly repo: Repository<Content>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
  ) {}

  /**
   * 某栏目的内容列表，服务端分页。置顶优先，其次 sort 降序（值大者靠前），最后按 id
   * 分页在库层做：一个栏目积累上千条后全量下发会同时拖慢接口与后台渲染
   * @param params 栏目标识、可选的关键字与日期区间筛选、分页参数
   */
  async list(params: {
    page?: number
    pageSize?: number
    channelKey: string
    keyword?: string
    startDate?: string
    endDate?: string
    status?: ContentStatus
  }): Promise<ContentPage> {
    const { channelKey, keyword, startDate, endDate, status } = params
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.channelKey = :channelKey', { channelKey })

    // 后台列表默认草稿与已发布都列出，只有显式筛选时才收窄
    if (status) qb.andWhere('c.status = :status', { status })

    if (keyword?.trim()) {
      qb.andWhere('(c.title LIKE :kw OR c.name LIKE :kw OR c.description LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      })
    }
    const range = this.buildDateRange(startDate, endDate)
    if (range) qb.andWhere('COALESCE(c.publishAt, c.createdAt) BETWEEN :from AND :to', range)

    const { page, pageSize, skip } = resolvePaging(params.page, params.pageSize, {
      defaultSize: DEFAULT_PAGE_SIZE,
      maxSize: MAX_PAGE_SIZE,
    })

    const [list, total] = await qb
      .orderBy('c.isTop', 'DESC')
      .addOrderBy('c.sort', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip(skip)
      .take(pageSize)
      .getManyAndCount()

    return { list, total, page, pageSize }
  }

  /**
   * 前台用：批量取多个栏目的内容，一次查库避免 N+1
   * 只出已发布：本方法仅服务前台（首页板块与栏目页区块），
   * 草稿在此被挡住，后台列表走 list() 不受影响
   * @param keys 栏目 key 列表
   * @param limitPerKey 每个 key 最多取几条；不传则不限
   */
  async listByChannelKeys(keys: string[], limitPerKey?: number): Promise<Content[]> {
    if (!keys.length) return []
    if (limitPerKey === undefined) {
      return this.repo.find({
        where: { channelKey: In(keys), status: CONTENT_STATUS.PUBLISHED },
        order: PORTAL_ORDER,
      })
    }
    // 逐 key 并发查询而非一条 SQL 加全局 take：全局上限会让条目多的 key
    // 把额度占满，后面的 key 一条都取不到，首页板块会凭空缺块
    const groups = await Promise.all(
      keys.map(key =>
        this.repo.find({
          where: { channelKey: key, status: CONTENT_STATUS.PUBLISHED },
          order: PORTAL_ORDER,
          take: limitPerKey,
        }),
      ),
    )
    return groups.flat()
  }

  /**
   * 前台用：单个栏目的内容分页，供栏目页区块「加载更多」
   * 与 listByChannelKeys 同序同过滤条件，保证翻页衔接不错位、不重复
   * @param channelKey 子栏目 key
   * @param page 页码，从 1 起
   * @param pageSize 每页条数
   */
  async listPagedByChannelKey(
    channelKey: string,
    page?: number,
    pageSize?: number,
    category?: string,
  ): Promise<PageResult<Content>> {
    const paging = resolvePaging(page, pageSize, {
      defaultSize: PORTAL_BLOCK_PAGE_SIZE,
      maxSize: PORTAL_MAX_PAGE_SIZE,
    })
    // 分类过滤为精确匹配：取值来自同级分类栏目的条目标题，
    // 前台按该标题原样回传，不做模糊匹配以免「锅炉」命中「燃气锅炉」
    const where: FindOptionsWhere<Content> = {
      channelKey,
      status: CONTENT_STATUS.PUBLISHED,
    }
    if (category) where.category = category

    const [list, total] = await this.repo.findAndCount({
      where,
      order: PORTAL_ORDER,
      skip: paging.skip,
      take: paging.pageSize,
    })
    return { list, total, page: paging.page, pageSize: paging.pageSize }
  }

  /**
   * 前台用：统计各栏目的已发布条数，供区块判断是否还有更多
   * @param keys 栏目 key 列表
   */
  async countByChannelKeys(keys: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    if (!keys.length) return result

    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.channelKey', 'channelKey')
      .addSelect('COUNT(1)', 'cnt')
      .where('c.channelKey IN (:...keys)', { keys })
      .andWhere('c.status = :status', { status: CONTENT_STATUS.PUBLISHED })
      .groupBy('c.channelKey')
      .getRawMany<{ channelKey: string; cnt: string | number }>()

    // COUNT 在不同驱动下回传 string 或 number，统一过一遍 Number
    rows.forEach(r => result.set(r.channelKey, Number(r.cnt)))
    return result
  }

  /** 单条详情；不传 id 时取该栏目第一条（单页型栏目只有一条内容） */
  async detail(params: { channelKey: string; id?: number }): Promise<Content | null> {
    const { channelKey, id } = params
    if (id !== undefined) {
      return this.repo.findOne({ where: { id, channelKey } })
    }
    return this.repo.findOne({
      where: { channelKey },
      order: { sort: 'DESC', id: 'DESC' },
    })
  }

  /** 保存：带 id 为更新，不带为新增 */
  async save(dto: SaveContentDto): Promise<Content> {
    const channel = await this.channelRepo.findOne({ where: { key: dto.channelKey } })
    if (!channel) throw new BadRequestException('栏目不存在，无法保存内容')

    // 新增时显式给定状态，不依赖 TypeORM 对列默认值的回填行为
    const entity = dto.id
      ? await this.repo.findOne({ where: { id: dto.id, channelKey: dto.channelKey } })
      : this.repo.create({ channelKey: dto.channelKey, status: CONTENT_STATUS.PUBLISHED })
    if (!entity) throw new NotFoundException('内容不存在')

    for (const field of TEXT_FIELDS) {
      const v = dto[field]
      if (v === undefined) continue
      // 富文本正文入库前过白名单：正文会以 HTML 原样渲染到前台，
      // 在此净化让库里存的就是干净数据，也挡住绕过前端直接打接口的注入
      const value = field === 'content' && typeof v === 'string' ? sanitizeRichText(v) : v
      entity[field] = typeof value === 'string' && value.trim() ? value : null
    }
    if (dto.sort !== undefined) entity.sort = dto.sort
    if (dto.isTop !== undefined) entity.isTop = dto.isTop
    if (dto.status !== undefined) entity.status = dto.status
    if (dto.publishAt !== undefined) entity.publishAt = this.parsePublishAt(dto.publishAt)

    return this.repo.save(entity)
  }

  /** 批量删除，只删该栏目下的记录，避免越栏目误删 */
  async remove(channelKey: string, ids: number[]): Promise<void> {
    if (!ids.length) throw new BadRequestException('请选择要删除的内容')
    await this.repo.delete({ channelKey, id: In(ids) })
  }

  /** 切换置顶 */
  async toggleTop(channelKey: string, id: number): Promise<boolean> {
    const entity = await this.repo.findOne({ where: { id, channelKey } })
    if (!entity) throw new NotFoundException('内容不存在')
    entity.isTop = !entity.isTop
    await this.repo.save(entity)
    return entity.isTop
  }

  /** 修改排序值 */
  async updateSort(channelKey: string, id: number, sort: number): Promise<void> {
    const entity = await this.repo.findOne({ where: { id, channelKey } })
    if (!entity) throw new NotFoundException('内容不存在')
    entity.sort = sort
    await this.repo.save(entity)
  }

  /**
   * 发布时间入库前的解析
   * 形态已由 DTO 的正则挡过，这里只管日期本身是否成立；不成立时报错而非静默清空——
   * 静默清空会让运营以为设上了，前台却显示成创建日期
   */
  private parsePublishAt(raw: string | null): Date | null {
    const value = raw?.trim()
    // 空串 / null 视为清空，前台与列表回落到创建时间
    if (!value) return null
    // 统一补成本地时间形态再解析：纯日期串 new Date() 会按 UTC 零点解释，
    // 东八区下显示成前一天 08:00，与管理端选的日期对不上
    const [date, time = '00:00:00'] = value.split(' ')
    const d = new Date(`${date}T${time}`)
    // 回转比对挡住 2026-02-31 这类会被 Date 静默进位成 3 月 3 日的值
    if (Number.isNaN(d.getTime()) || formatDateTime(d) !== `${date} ${time}`) {
      throw new BadRequestException('发布时间不是有效日期')
    }
    return d
  }

  /** 日期区间条件，只传一端时按单边比较 */
  private buildDateRange(
    startDate?: string,
    endDate?: string,
  ): { from: Date; to: Date } | null {
    if (!startDate && !endDate) return null
    const from = startDate ? new Date(`${startDate}T00:00:00`) : new Date('1970-01-01T00:00:00')
    const to = endDate ? new Date(`${endDate}T23:59:59`) : new Date('2999-12-31T23:59:59')
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
    return { from, to }
  }
}
