// 内容服务 —— 按栏目 key 组织的内容增删改查
// 一张宽表存所有栏目内容，各栏目按自己的 formFields 取用字段
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { sanitizeRichText } from '../../common/html-sanitizer'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import type { SaveContentDto } from './dto/content.dto'

/** 可写文本字段，空串按清空处理 */
const TEXT_FIELDS = [
  'title', 'name', 'subtitle', 'keywords', 'description', 'intro', 'content',
  'cover', 'video', 'whiteCover', 'file', 'link', 'category', 'icon', 'brand', 'author', 'source',
] as const

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content) private readonly repo: Repository<Content>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
  ) {}

  /**
   * 某栏目的内容列表。置顶优先，其次 sort 降序（值大者靠前），最后按 id
   * @param params 栏目标识与可选的关键字、日期区间筛选
   */
  async list(params: {
    channelKey: string
    keyword?: string
    startDate?: string
    endDate?: string
  }): Promise<Content[]> {
    const { channelKey, keyword, startDate, endDate } = params
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.channelKey = :channelKey', { channelKey })

    if (keyword?.trim()) {
      qb.andWhere('(c.title LIKE :kw OR c.name LIKE :kw OR c.description LIKE :kw)', {
        kw: `%${keyword.trim()}%`,
      })
    }
    const range = this.buildDateRange(startDate, endDate)
    if (range) qb.andWhere('COALESCE(c.publishAt, c.createdAt) BETWEEN :from AND :to', range)

    return qb
      .orderBy('c.isTop', 'DESC')
      .addOrderBy('c.sort', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .getMany()
  }

  /** 前台用：批量取多个栏目的内容，一次查库避免 N+1 */
  async listByChannelKeys(keys: string[]): Promise<Content[]> {
    if (!keys.length) return []
    return this.repo.find({
      where: { channelKey: In(keys) },
      order: { isTop: 'DESC', sort: 'DESC', id: 'DESC' },
    })
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

    const entity = dto.id
      ? await this.repo.findOne({ where: { id: dto.id, channelKey: dto.channelKey } })
      : this.repo.create({ channelKey: dto.channelKey })
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

  /** 发布时间入库前的解析，非法值按未设置处理 */
  private parsePublishAt(raw: string): Date | null {
    if (!raw.trim()) return null
    const d = new Date(raw.trim())
    return Number.isNaN(d.getTime()) ? null : d
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
