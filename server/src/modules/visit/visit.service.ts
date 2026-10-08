// 访问采集与汇总服务 —— 前台埋点落库 + 按日期范围聚合供后台查阅
import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, LessThan, Repository } from 'typeorm'
import { Channel } from '../cms/channel.entity'
import { VisitLog } from './visit-log.entity'

/** 单日访问量 */
interface DailyCount {
  date: string
  count: number
}

/** 板块访问量 */
interface ChannelCount {
  name: string
  visits: number
}

/** 访问统计聚合结果 */
export interface VisitSummary {
  total: number
  avg: number
  dates: string[]
  values: number[]
  sections: ChannelCount[]
}

/** 统计范围上限：避免自定义日期跨度过大拖慢查询与图表渲染 */
const MAX_RANGE_DAYS = 90

/** 纯日期格式，清理操作的入参兜底校验用 */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

@Injectable()
export class VisitService {
  constructor(
    @InjectRepository(VisitLog) private readonly repo: Repository<VisitLog>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
  ) {}

  /**
   * 记录一次板块访问
   * 上报的 key 必须是前台已开放的一级栏目，杜绝伪造 key 污染统计维度
   * @param channelKey 前台一级栏目 key
   * @param visitorIp 访客 IP，可为空
   * @returns 是否已记录（key 非法时静默丢弃）
   */
  async record(channelKey: string, visitorIp: string | null): Promise<boolean> {
    const exists = await this.channelRepo.exists({
      where: { key: channelKey, parentId: IsNull() },
    })
    if (!exists) return false
    await this.repo.save(
      this.repo.create({
        channelKey,
        visitorIp,
        visitedDate: toDateKey(new Date()),
      }),
    )
    return true
  }

  /**
   * 按日期范围聚合访问数据
   * @param startDate 起始日期 YYYY-MM-DD（含）
   * @param endDate 结束日期 YYYY-MM-DD（含）
   */
  async summary(startDate: string, endDate: string): Promise<VisitSummary> {
    // 趋势要补齐无访问的日期，否则折线图的日期轴会跳段
    const dates = enumerateDates(startDate, endDate)
    // 所有指标共用截取后的同一段日期：超过 90 天时 enumerateDates 只保留近 90 天，
    // 板块关注度若仍按原始范围统计，同一屏上两组数字口径不一、对不上总数
    const effectiveStart = dates[0] ?? startDate
    const daily = await this.countByDate(effectiveStart, endDate)
    const sections = await this.countByChannel(effectiveStart, endDate)
    const countMap = new Map(daily.map((d) => [d.date, d.count]))
    const values = dates.map((d) => countMap.get(d) ?? 0)
    const total = values.reduce((sum, v) => sum + v, 0)
    return {
      total,
      // 日均按统计天数算，不按有访问的天数算，与 SRS「总访问量 ÷ 统计天数」一致
      avg: dates.length > 0 ? Math.round(total / dates.length) : 0,
      dates,
      values,
      sections,
    }
  }

  /** 累计访问量（不限日期） */
  async countAll(): Promise<number> {
    return this.repo.count()
  }

  /**
   * 清理指定日期之前的访问日志（不含该日）
   * 访问日志只增不减会拖慢仪表盘与统计聚合，故提供按日期清理。
   * 比 visitedDate 字符串而非 visitedAt 时间戳：该列是 YYYY-MM-DD 定长字符串，
   * 字典序即时间序，且与联合索引的首列一致，不必对时间戳做函数运算。
   * @param beforeDate 分界日期 YYYY-MM-DD，早于该日的记录被删除
   * @returns 实际删除条数
   */
  async clearBefore(beforeDate: string): Promise<number> {
    // 不可逆的批量删除，不把安全性全押在 DTO 上：
    // 本方法也被定时任务路径调用（不过 DTO 校验），格式不合即拒绝执行。
    // 空串在字典序比较下小于任何日期，若放过则 LessThan('') 匹配不到行还算幸运，
    // 但格式错误的值（如 '2026-9-1'）会因字典序错位删掉不该删的区间
    if (!DATE_ONLY_PATTERN.test(beforeDate)) {
      throw new BadRequestException('清理分界日期格式应为 YYYY-MM-DD')
    }
    const result = await this.repo.delete({ visitedDate: LessThan(beforeDate) })
    return result.affected ?? 0
  }

  /**
   * 按保留天数清理访问日志
   * 供定时任务调用：只保留最近 days 天（含今日），更早的删除
   * @param days 保留天数，须为正整数
   * @returns 实际删除条数
   */
  async clearOlderThanDays(days: number): Promise<number> {
    // 保留窗口的起始日即分界日：早于它的删除，它自身及之后保留。
    // 复用 rangeOfLastDays 而非另算一遍，保证「最近 N 天」的口径与统计查询完全一致
    const { startDate } = rangeOfLastDays(days)
    return this.clearBefore(startDate)
  }

  /** 指定日期的访问量 */
  async countByDay(date: string): Promise<number> {
    return this.repo.count({ where: { visitedDate: date } })
  }

  /** 按日期分组计数 */
  private async countByDate(startDate: string, endDate: string): Promise<DailyCount[]> {
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('v.visitedDate', 'date')
      .addSelect('COUNT(1)', 'count')
      .where('v.visitedDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('v.visitedDate')
      .getRawMany<{ date: string; count: string | number }>()
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }))
  }

  /**
   * 按板块分组计数
   * 以前台已开放的一级栏目为全集，无访问的板块补 0，保证板块列表稳定
   */
  private async countByChannel(startDate: string, endDate: string): Promise<ChannelCount[]> {
    const channels = await this.channelRepo.find({
      where: { parentId: IsNull() },
      order: { sort: 'ASC', id: 'ASC' },
    })
    const portalChannels = channels.filter((c) => c.portalPath && !c.hidden)
    const rows = await this.repo
      .createQueryBuilder('v')
      .select('v.channelKey', 'channelKey')
      .addSelect('COUNT(1)', 'count')
      .where('v.visitedDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('v.channelKey')
      .getRawMany<{ channelKey: string; count: string | number }>()
    const countMap = new Map(rows.map((r) => [r.channelKey, Number(r.count)]))
    return portalChannels.map((c) => ({
      name: c.name,
      visits: countMap.get(c.key) ?? 0,
    }))
  }
}

/** Date → YYYY-MM-DD，按本地时区取，与前端展示的日期一致 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 列出起止日期之间的全部日期（含两端）
 * 超出上限时从结束日期往前截取，保留用户更关心的近期数据
 */
export function enumerateDates(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []
  const dates: string[] = []
  for (const cursor = new Date(end); cursor >= start; cursor.setDate(cursor.getDate() - 1)) {
    dates.push(toDateKey(cursor))
    if (dates.length >= MAX_RANGE_DAYS) break
  }
  return dates.reverse()
}

/**
 * 由天数推出起止日期，含今日
 * @param days 统计天数
 */
export function rangeOfLastDays(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - (days - 1))
  return { startDate: toDateKey(start), endDate: toDateKey(end) }
}
