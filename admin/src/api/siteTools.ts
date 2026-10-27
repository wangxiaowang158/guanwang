// 站点工具接口层 —— 跳转规则 /api/mgmt/redirect/*、数据备份 /api/mgmt/backup/*
import axios from 'axios'
import type { ApiResult } from './auth'

/** 跳转规则 */
export interface RedirectRule {
  id: number
  /** 旧地址，后端已规整（小写、无尾斜杠、无查询串） */
  fromPath: string
  toUrl: string
  statusCode: 301 | 302
  enabled: boolean
  remark: string
  /** 命中次数，长期为 0 的规则可放心删除 */
  hits: number
  lastHitAt: string
  createTime: string
}

export interface RedirectPage {
  list: RedirectRule[]
  total: number
  page: number
  pageSize: number
}

/** 跳转规则列表 */
export const getRedirectList = (params: { page?: number; pageSize?: number; keyword?: string }) =>
  axios.get<ApiResult<RedirectPage>>('/api/mgmt/redirect/list', { params })

/** 新增 / 修改跳转规则 */
export const saveRedirect = (data: {
  id?: number
  fromPath: string
  toUrl: string
  statusCode: 301 | 302
  enabled: boolean
  remark?: string
}) => axios.post<ApiResult<RedirectRule>>('/api/mgmt/redirect/save', data)

/** 批量删除跳转规则 */
export const deleteRedirects = (ids: number[]) =>
  axios.delete<ApiResult<{ changed: number }>>('/api/mgmt/redirect/delete', { data: { ids } })

/**
 * 导出数据备份（仅超管），成功回 JSON 文件流，失败回业务 JSON
 * @param withLogs 是否连同访问 / 操作 / 登录日志
 */
export const exportBackup = (withLogs: boolean) =>
  axios.get<Blob>('/api/mgmt/backup/export', {
    params: withLogs ? { withLogs: 1 } : undefined,
    responseType: 'blob',
  })
