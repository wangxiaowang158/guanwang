// 数据仪表盘接口层 —— 聚合访问量/留言/新闻案例指标（只读）
import axios from 'axios'
import type { ApiResult } from './auth'

/** 仪表盘指标卡数据 */
export interface DashboardMetrics {
  totalVisits: number
  todayVisits: number
  messageTotal: number
  messageUnread: number
  newsCount: number
}

/** 访问趋势数据（按日） */
export interface TrendData {
  dates: string[]
  values: number[]
}

/** 最新留言概览项 */
export interface RecentMessage {
  id: number
  name: string
  submitTime: string
  status: 'unread' | 'done'
}

/** 获取仪表盘指标卡数据 */
export const getDashboardMetrics = () =>
  axios.get<ApiResult<DashboardMetrics>>('/api/dashboard/metrics')

/** 获取访问趋势（range: 7|30，按日） */
export const getDashboardTrend = (range: 7 | 30) =>
  axios.get<ApiResult<TrendData>>('/api/dashboard/trend', { params: { range } })

/** 获取最新留言概览 */
export const getRecentMessages = () =>
  axios.get<ApiResult<RecentMessage[]>>('/api/dashboard/recent-messages')
