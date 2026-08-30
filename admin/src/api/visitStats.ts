// 访问统计接口层 —— 按日期范围聚合访问趋势与板块关注度（只读）
import axios from 'axios'
import type { ApiResult } from './auth'

/** 板块关注度项 */
export interface SectionVisit {
  name: string
  visits: number
}

/** 访问统计聚合结果 */
export interface VisitSummary {
  total: number
  avg: number
  dates: string[]
  values: number[]
  sections: SectionVisit[]
}

/** 访问统计查询参数：range 预设范围 或 startDate+endDate 自定义 */
export interface VisitQuery {
  range?: 7 | 30
  startDate?: string
  endDate?: string
}

/** 获取访问统计聚合数据 */
export const getVisitSummary = (params: VisitQuery) =>
  axios.get<ApiResult<VisitSummary>>('/api/visit-stats/summary', { params })
