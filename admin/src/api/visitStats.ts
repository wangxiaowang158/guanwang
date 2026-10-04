// 访问统计接口层 —— 走真实后端 /api/mgmt/visit-stats/*，按日期范围聚合访问趋势与板块关注度（只读）
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
  axios.get<ApiResult<VisitSummary>>('/api/mgmt/visit-stats/summary', { params })

/**
 * 清理指定日期之前的访问日志（不含该日），不可撤销
 * @param before 分界日期 YYYY-MM-DD
 * @returns 实际删除条数
 */
export const clearVisitLog = (before: string) =>
  axios.delete<ApiResult<{ count: number } | null>>('/api/mgmt/visit-stats/clear', {
    params: { before },
  })
