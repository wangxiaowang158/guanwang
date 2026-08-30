// 反馈业务服务 —— 匿名与会员两条提交路径 + 后台查询回复与状态流转
// 状态流转一律走 FEEDBACK_STATUS_FLOW 白名单校验，不接受任意跳转
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, In, Repository } from 'typeorm'
import { Feedback } from './feedback.entity'
import { FeedbackReply } from './feedback-reply.entity'
import { Member } from '../member/member.entity'
import {
  FEEDBACK_SOURCE, FEEDBACK_STATUS, FEEDBACK_STATUS_FLOW, type FeedbackStatus,
} from '../../common/enums'
import {
  toFeedbackDetailVo, toFeedbackListItemVo, toMemberFeedbackVo,
} from './vo/feedback.vo'
import type { FeedbackDetailVo, FeedbackListItemVo, MemberFeedbackVo } from './vo/feedback.vo'
import type {
  FeedbackQueryDto, ReplyFeedbackDto, SubmitAnonymousFeedbackDto,
  SubmitMemberFeedbackDto, UpdateFeedbackStatusDto,
} from './dto/feedback.dto'
import type { Result } from '../member/member-auth.service'
import type { RequestContext } from '../../common/request-context'

/** 默认分页参数 */
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private readonly repo: Repository<Feedback>,
    @InjectRepository(FeedbackReply)
    private readonly replyRepo: Repository<FeedbackReply>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  /** 匿名咨询提交：沿用原留言入口，无需登录 */
  async submitAnonymous(
    dto: SubmitAnonymousFeedbackDto,
    ctx: RequestContext,
  ): Promise<Result<{ id: number }>> {
    const entity = this.repo.create({
      source: FEEDBACK_SOURCE.ANONYMOUS,
      memberId: null,
      company: dto.company || null,
      name: dto.name,
      phone: dto.phone,
      feedbackType: dto.feedbackType || null,
      content: dto.content,
      status: FEEDBACK_STATUS.PENDING,
      submitIp: ctx.ip,
      sourcePage: dto.sourcePage || null,
    })
    const saved = await this.repo.save(entity)
    return { ok: true, data: { id: saved.id } }
  }

  /** 会员提交反馈：姓名取昵称快照，联系电话缺省沿用账号手机号 */
  async submitByMember(
    memberId: number,
    dto: SubmitMemberFeedbackDto,
    ctx: RequestContext,
  ): Promise<Result<{ id: number }>> {
    const member = await this.memberRepo.findOne({
      where: { id: memberId },
      select: ['id', 'nickname', 'phone'],
    })
    if (!member) return { ok: false, message: '会员不存在' }

    const entity = this.repo.create({
      source: FEEDBACK_SOURCE.MEMBER,
      memberId,
      company: null,
      name: member.nickname,
      phone: dto.phone || member.phone,
      feedbackType: dto.feedbackType || null,
      content: dto.content,
      status: FEEDBACK_STATUS.PENDING,
      submitIp: ctx.ip,
      sourcePage: dto.sourcePage || null,
    })
    const saved = await this.repo.save(entity)
    return { ok: true, data: { id: saved.id } }
  }

  /** 前台「我的反馈」：只返回本人记录，且仅含对会员可见的回复 */
  async listByMember(memberId: number): Promise<Result<MemberFeedbackVo[]>> {
    const items = await this.repo.find({
      where: { memberId, source: FEEDBACK_SOURCE.MEMBER },
      order: { createdAt: 'DESC' },
    })
    if (items.length === 0) return { ok: true, data: [] }

    const replies = await this.replyRepo.find({
      where: { feedbackId: In(items.map((i) => i.id)) },
      order: { createdAt: 'ASC' },
    })
    const grouped = this.groupReplies(replies)
    return { ok: true, data: items.map((f) => toMemberFeedbackVo(f, grouped.get(f.id) ?? [])) }
  }

  /** 后台分页查询反馈 */
  async list(query: FeedbackQueryDto): Promise<{
    list: FeedbackListItemVo[]
    total: number
    page: number
    pageSize: number
  }> {
    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE
    const pageSize = Math.min(query.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

    const qb = this.repo.createQueryBuilder('f')
    if (query.source) qb.andWhere('f.source = :source', { source: query.source })
    if (query.status) qb.andWhere('f.status = :status', { status: query.status })
    if (query.feedbackType) qb.andWhere('f.feedbackType = :feedbackType', { feedbackType: query.feedbackType })

    if (query.keyword) {
      const kw = `%${query.keyword}%`
      qb.andWhere(
        new Brackets((w) => {
          w.where('f.company LIKE :kw', { kw })
            .orWhere('f.name LIKE :kw', { kw })
            .orWhere('f.phone LIKE :kw', { kw })
            .orWhere('f.content LIKE :kw', { kw })
        }),
      )
    }
    // 日期为闭区间：结束日当天 23:59:59 仍计入。
    // 必须传 Date 对象而非字符串：createdAt 以 UTC 存储，直接拼本地日期字符串比较会
    // 漏掉本地凌晨 0-8 点的记录（其 UTC 值落在前一天）。
    if (query.startDate) {
      qb.andWhere('f.createdAt >= :start', { start: new Date(`${query.startDate}T00:00:00`) })
    }
    if (query.endDate) {
      qb.andWhere('f.createdAt <= :end', { end: new Date(`${query.endDate}T23:59:59.999`) })
    }

    const [items, total] = await qb
      .orderBy('f.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // 一次性取回本页回复数，避免逐条查询
    const counts = await this.countReplies(items.map((i) => i.id))
    return {
      list: items.map((f) => toFeedbackListItemVo(f, counts.get(f.id) ?? 0)),
      total,
      page,
      pageSize,
    }
  }

  /** 后台反馈详情，含全部回复与会员昵称 */
  async detail(id: number): Promise<Result<FeedbackDetailVo>> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) return { ok: false, message: '反馈不存在' }

    const replies = await this.replyRepo.find({
      where: { feedbackId: id },
      order: { createdAt: 'ASC' },
    })

    let nickname: string | null = null
    if (item.memberId !== null) {
      const member = await this.memberRepo.findOne({
        where: { id: item.memberId },
        select: ['id', 'nickname'],
      })
      nickname = member?.nickname ?? null
    }
    return { ok: true, data: toFeedbackDetailVo(item, replies, nickname) }
  }

  /**
   * 后台回复反馈。回复成功后状态自动推进到「已回复」，
   * 但已关闭的反馈不允许再回复（终态不可写）。
   */
  async reply(id: number, dto: ReplyFeedbackDto): Promise<Result<{ replyId: number }>> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) return { ok: false, message: '反馈不存在' }
    if (item.status === FEEDBACK_STATUS.CLOSED) {
      return { ok: false, message: '该反馈已关闭，不能再回复' }
    }

    // 未显式指定时按来源判定：匿名提交者无账号入口，回复仅作后台留痕
    const visibleToMember = dto.visibleToMember ?? item.source === FEEDBACK_SOURCE.MEMBER

    const reply = await this.replyRepo.save(
      this.replyRepo.create({
        feedbackId: id,
        content: dto.content,
        repliedBy: dto.repliedBy || null,
        visibleToMember,
      }),
    )

    if (this.canTransit(item.status, FEEDBACK_STATUS.REPLIED)) {
      item.status = FEEDBACK_STATUS.REPLIED
      await this.repo.save(item)
    }
    return { ok: true, data: { replyId: reply.id } }
  }

  /** 后台变更状态，须符合流转白名单 */
  async updateStatus(id: number, dto: UpdateFeedbackStatusDto): Promise<Result<null>> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) return { ok: false, message: '反馈不存在' }

    if (item.status === dto.status) return { ok: true, data: null }
    if (!this.canTransit(item.status, dto.status)) {
      return { ok: false, message: `不允许从「${item.status}」变更为「${dto.status}」` }
    }

    item.status = dto.status
    await this.repo.save(item)
    return { ok: true, data: null }
  }

  /** 后台删除反馈，连带清除其回复（物理删除，反馈无留痕需求） */
  async remove(ids: number[]): Promise<Result<{ removed: number }>> {
    if (ids.length === 0) return { ok: false, message: '未指定要删除的记录' }

    const items = await this.repo.find({ where: { id: In(ids) }, select: ['id'] })
    if (items.length === 0) return { ok: false, message: '反馈不存在' }

    const existingIds = items.map((i) => i.id)
    await this.replyRepo.delete({ feedbackId: In(existingIds) })
    await this.repo.delete({ id: In(existingIds) })
    return { ok: true, data: { removed: existingIds.length } }
  }

  /** 校验状态流转是否在白名单内 */
  private canTransit(from: FeedbackStatus, to: FeedbackStatus): boolean {
    return FEEDBACK_STATUS_FLOW[from].includes(to)
  }

  /** 按反馈 id 归组回复 */
  private groupReplies(replies: FeedbackReply[]): Map<number, FeedbackReply[]> {
    const grouped = new Map<number, FeedbackReply[]>()
    for (const r of replies) {
      const list = grouped.get(r.feedbackId)
      if (list) list.push(r)
      else grouped.set(r.feedbackId, [r])
    }
    return grouped
  }

  /** 批量统计回复数 */
  private async countReplies(ids: number[]): Promise<Map<number, number>> {
    const result = new Map<number, number>()
    if (ids.length === 0) return result

    const rows = await this.replyRepo
      .createQueryBuilder('r')
      .select('r.feedbackId', 'feedbackId')
      .addSelect('COUNT(r.id)', 'cnt')
      .where('r.feedbackId IN (:...ids)', { ids })
      .groupBy('r.feedbackId')
      .getRawMany<{ feedbackId: number; cnt: string }>()

    for (const row of rows) result.set(Number(row.feedbackId), Number(row.cnt))
    return result
  }
}
