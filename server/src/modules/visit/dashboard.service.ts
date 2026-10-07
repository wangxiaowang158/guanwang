// 数据仪表盘聚合服务 —— 汇总访问量、反馈、内容三方指标
// 指标口径见 SRS 3.5.4：访问量取自访问统计，反馈取自意见反馈，新闻案例数取自内容管理
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CONTENT_STATUS, FEEDBACK_STATUS } from '../../common/enums'
import { Channel } from '../cms/channel.entity'
import { Content } from '../cms/content.entity'
import { Feedback } from '../feedback/feedback.entity'
import { rangeOfLastDays, toDateKey, VisitService } from './visit.service'

/** 新闻案例数的统计范围：这两个一级栏目下的已发布内容 */
const NEWS_CASE_ROOT_KEYS = ['news', 'case']

/**
 * 分类栏目：条目是前台筛选项的名称，不是新闻或案例，不计入新闻案例数
 * 与 admin/src/views/Cms/categorySources.ts、web/src/config/channelFilters.ts 中的分类栏目一致
 */
const TAXONOMY_CHANNEL_KEYS = ['case-industry', 'case-category']

/** 最新反馈概览条数，SRS 3.5.4 规定 5 条 */
const RECENT_FEEDBACK_LIMIT = 5

/** 仪表盘指标卡 */
export interface DashboardMetrics {
  totalVisits: number
  todayVisits: number
  feedbackTotal: number
  feedbackPending: number
  newsCount: number
}

/** 最新反馈概览项 */
export interface RecentFeedbackItem {
  id: number
  name: string
  submitTime: string
  status: string
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Feedback) private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
    @InjectRepository(Channel) private readonly channelRepo: Repository<Channel>,
    private readonly visitService: VisitService,
  ) {}

  /** 指标卡数据，五项指标并行取数 */
  async metrics(): Promise<DashboardMetrics> {
    const [totalVisits, todayVisits, feedbackTotal, feedbackPending, newsCount] = await Promise.all([
      this.visitService.countAll(),
      this.visitService.countByDay(toDateKey(new Date())),
      this.feedbackRepo.count(),
      this.feedbackRepo.count({ where: { status: FEEDBACK_STATUS.PENDING } }),
      this.countNewsCase(),
    ])
    return { totalVisits, todayVisits, feedbackTotal, feedbackPending, newsCount }
  }

  /**
   * 访问趋势
   * 与访问统计同一套汇总逻辑，保证两处数据口径一致（SRS 3.5.4「两处数据口径一致」）
   * @param days 统计天数
   */
  async trend(days: number): Promise<{ dates: string[]; values: number[] }> {
    const { startDate, endDate } = rangeOfLastDays(days)
    const summary = await this.visitService.summary(startDate, endDate)
    return { dates: summary.dates, values: summary.values }
  }

  /**
   * 最新反馈概览
   * name 字段在提交时已按来源写定（会员填昵称、匿名填姓名），此处无需再关联会员表
   */
  async recentFeedback(): Promise<RecentFeedbackItem[]> {
    const rows = await this.feedbackRepo.find({
      order: { createdAt: 'DESC', id: 'DESC' },
      take: RECENT_FEEDBACK_LIMIT,
    })
    return rows.map((f) => ({
      id: f.id,
      name: f.name,
      submitTime: formatDateTime(f.createdAt),
      status: f.status,
    }))
  }

  /**
   * 已发布的新闻案例总数（SRS 3.5.4）
   * 按栏目树统计：取 news / case 两棵子树下各层级的栏目 key，只数已发布内容。
   * 后台可在任意栏目下新增子栏目，层级不止两层，因此按整棵子树递归收集。
   * 排除两类不该计入的条目：草稿（访客看不到）、分类栏目里的选项条目
   * （「行业分类」「类别分类」录的是筛选项名称，不是新闻或案例）
   */
  private async countNewsCase(): Promise<number> {
    const all = await this.channelRepo.find({ select: ['id', 'key', 'parentId'] })
    const keys: string[] = []
    const walk = (parentId: number) => {
      for (const c of all) {
        if (c.parentId === parentId) {
          keys.push(c.key)
          walk(c.id)
        }
      }
    }
    for (const root of all) {
      if (root.parentId === null && NEWS_CASE_ROOT_KEYS.includes(root.key)) {
        keys.push(root.key)
        walk(root.id)
      }
    }
    const countable = keys.filter((k) => !TAXONOMY_CHANNEL_KEYS.includes(k))
    if (countable.length === 0) return 0
    return this.contentRepo.count({ where: { channelKey: In(countable), status: CONTENT_STATUS.PUBLISHED } })
  }
}

/** Date → YYYY-MM-DD HH:mm:ss */
function formatDateTime(date: Date | null): string {
  if (!date) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const d = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${d} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
