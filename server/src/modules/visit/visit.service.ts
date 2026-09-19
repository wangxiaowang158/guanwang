// 访问采集与汇总服务 —— 前台埋点落库 + 按日期范围聚合供后台查阅
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
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
    const daily = await this.countByDate(startDate, endDate)
    const sections = await this.countByChannel(startDate, endDate)
    // 趋势要补齐无访问的日期，否则折线图的日期轴会跳段
    const dates = enumerateDates(startDate, endDate)
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
    const portalChannels = channels.filter((c) => c.portalPath)
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
