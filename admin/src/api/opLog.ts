// 管理端操作日志接口层 —— /api/mgmt/op-log/*
// 只读 + 按日期清理，日志由后端拦截器在每次写操作后自动写入；仅超管可访问
import axios from 'axios'
import type { ApiResult } from './auth'
import type { PageResult } from './member'

/** 操作结果 */
export type OpLogResult = 'success' | 'failure'

/** 操作结果中文名 */
export const OP_LOG_RESULT_LABEL: Record<OpLogResult, string> = {
  success: '成功',
  failure: '失败',
}

/** 操作日志条目 */
export interface OpLogItem {
  id: number
  adminId: number
  /** 操作人账号快照，账号改名或删除后仍保留当时取值 */
  adminAccount: string
  adminName: string | null
  /** 操作说明，如「保存内容」 */
  action: string
  module: string
  method: string
  /** 请求路径，不含查询串 */
  path: string
  /** 请求参数快照，密码一类字段已脱敏、超长已截断 */
  params: string | null
  ip: string | null
  result: OpLogResult
  /** 失败原因，仅失败记录有值 */
  errorMessage: string | null
  createdAt: string
}

/** 操作日志查询参数 */
export interface OpLogQuery {
  keyword?: string
  module?: string
  result?: OpLogResult
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/**
 * 获取操作日志列表（支持关键词、模块、结果、日期范围筛选）
 * @param params 查询参数，日期格式 YYYY-MM-DD
 */
export const getOpLogList = (params: OpLogQuery) =>
  axios.get<ApiResult<PageResult<OpLogItem>>>('/api/mgmt/op-log/list', { params })

/** 获取可筛选的模块名列表 */
export const getOpLogModules = () => axios.get<ApiResult<string[]>>('/api/mgmt/op-log/modules')

/**
 * 清理指定日期之前的操作日志
 * @param before 日期，格式 YYYY-MM-DD，该日期之前的记录会被物理删除
 */
export const clearOpLog = (before: string) =>
  axios.delete<ApiResult<{ count: number } | null>>('/api/mgmt/op-log/clear', {
    params: { before },
  })
