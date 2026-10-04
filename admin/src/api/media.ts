// 素材库接口层 —— 走真实后端 /api/mgmt/media/*
// 数据源是上传目录的磁盘文件，不是数据库表，故没有 id，用站内地址作唯一标识
import axios from 'axios'
import type { ApiResult } from './auth'
import type { PageResult } from './member'

/** 素材类型 */
export type MediaType = 'image' | 'video' | 'other'

/** 素材列表项 */
export interface MediaItem {
  /** 站内访问地址，同时作为删除与选用时的唯一标识 */
  url: string
  name: string
  ext: string
  type: MediaType
  /** 字节数 */
  size: number
  /** 修改时间毫秒值 */
  mtime: number
  /** 所属月份目录，落在根目录时为空串 */
  bucket: string
  /** 是否仍被内容或站点配置引用；已引用的不可删除 */
  referenced: boolean
  /** 是否在 24 小时保护期内（可能刚传完还没保存内容） */
  recent: boolean
}

/** 素材库整体统计，取全量而非当前筛选结果 */
export interface MediaStat {
  total: number
  image: number
  video: number
  other: number
  unused: number
  totalSize: number
  unusedSize: number
}

/** 素材列表查询参数 */
export interface MediaQuery {
  type?: 'all' | MediaType
  keyword?: string
  unusedOnly?: boolean
  sortBy?: 'mtime' | 'size'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/** 素材列表响应：分页结构外附带整体统计 */
export type MediaPage = PageResult<MediaItem> & { stat: MediaStat }

/**
 * 查询素材分页列表
 * @param params 类型筛选、关键词、排序与分页参数
 */
export const getMediaList = (params: MediaQuery) =>
  axios.get<ApiResult<MediaPage>>('/api/mgmt/media/list', { params })

/**
 * 删除素材，不可撤销
 * 仍被引用的素材会被后端拒绝，不必在前端提前判断（前端的引用状态可能已过期）
 * @param url 素材站内地址
 */
export const deleteMedia = (url: string) =>
  axios.delete<ApiResult<{ url: string } | null>>('/api/mgmt/media/delete', { data: { url } })
