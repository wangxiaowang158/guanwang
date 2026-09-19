// 数据仪表盘接口层 —— 走真实后端 /api/mgmt/dashboard/*，聚合访问量/反馈/内容指标（只读）
import axios from 'axios'
import type { ApiResult } from './auth'
import type { FeedbackStatus } from './feedback'

/** 仪表盘指标卡数据 */
export interface DashboardMetrics {
  totalVisits: number
  todayVisits: number
  feedbackTotal: number
  feedbackPending: number
  newsCount: number
}

/** 访问趋势数据（按日），dates 为 YYYY-MM-DD */
export interface TrendData {
  dates: string[]
  values: number[]
}

/** 最新反馈概览项 */
export interface RecentFeedback {
  id: number
  name: string
  submitTime: string
  status: FeedbackStatus
}

/** 获取仪表盘指标卡数据 */
export const getDashboardMetrics = () =>
  axios.get<ApiResult<DashboardMetrics>>('/api/mgmt/dashboard/metrics')

/**
 * 获取访问趋势
 * @param range 统计天数，仅支持 7 与 30
 */
export const getDashboardTrend = (range: 7 | 30) =>
  axios.get<ApiResult<TrendData>>('/api/mgmt/dashboard/trend', { params: { range } })

/** 获取最新反馈概览（5 条） */
export const getRecentFeedback = () =>
  axios.get<ApiResult<RecentFeedback[]>>('/api/mgmt/dashboard/recent-feedback')
