// 文件上传接口层 —— 走真实后端 /api/mgmt/upload/*
import axios from 'axios'
import type { ApiResult } from './auth'

/** 上传结果：站内可访问的文件地址 */
export interface UploadResult {
  url: string
}

/**
 * 上传图片，返回站内访问地址
 * 用 FormData 提交，Content-Type 交由浏览器生成（须带 boundary，不可手写）
 * @param file 已通过类型与大小校验的图片文件
 * @param raw 原图上传：Logo、站点图标、二维码、分享图等品牌素材，不加水印、不转 WebP
 */
export const uploadImage = (file: File, raw = false) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post<ApiResult<UploadResult | null>>('/api/mgmt/upload/image', form, {
    params: raw ? { raw: 1 } : undefined,
  })
}

/** 附件上传结果：站内地址 + 原文件名（落盘用随机名，原名只供后台展示） */
export interface DocumentUploadResult {
  url: string
  name: string
}

/**
 * 上传附件（PDF / Word / Excel / PPT），返回站内访问地址
 * @param file 已通过扩展名与大小校验的文件
 */
export const uploadDocument = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post<ApiResult<DocumentUploadResult | null>>('/api/mgmt/upload/document', form)
}

/** AI 生成的候选封面图：id 用于保存，previewUrl 为 data URL 仅供预览 */
export interface AiImageCandidate {
  id: string
  previewUrl: string
}

/** AI 生图是否已在服务端配置密钥，及每次候选张数、描述字数上限 */
export interface AiImageStatus {
  enabled: boolean
  count?: number
  promptMaxLen?: number
}

/**
 * AI 生图使用场景，与服务端 AI_IMAGE_SCENES 的键一致
 * cover 内容封面 / banner 横幅背景 / square 方形图标或二维码 / illustration 正文配图
 */
export type AiImageScene = 'cover' | 'banner' | 'square' | 'illustration'

/** 生图耗时常见 10-60 秒，超时须长于服务端的 90 秒上游超时，由服务端先给出明确报错 */
const AI_IMAGE_TIMEOUT_MS = 100_000

/** 查询 AI 生图是否可用，GET /api/mgmt/upload/ai-image/status */
export const getAiImageStatus = () =>
  axios.get<ApiResult<AiImageStatus | null>>('/api/mgmt/upload/ai-image/status')

/**
 * 按描述生成一批候选图，POST /api/mgmt/upload/ai-image
 * @param prompt 图片描述，字数上限见 getAiImageStatus
 * @param scene 使用场景，决定出图比例与风格约束
 */
export const generateAiImages = (prompt: string, scene: AiImageScene = 'cover') =>
  axios.post<ApiResult<{ items: AiImageCandidate[] } | null>>(
    '/api/mgmt/upload/ai-image',
    { prompt, scene },
    { timeout: AI_IMAGE_TIMEOUT_MS }
  )

/**
 * 把选中的 AI 候选图落盘，POST /api/mgmt/upload/ai-image/save
 * @param id 生成接口返回的候选 id
 */
export const saveAiImage = (id: string) =>
  axios.post<ApiResult<UploadResult | null>>('/api/mgmt/upload/ai-image/save', { id })

/**
 * 上传视频，返回站内访问地址
 * 视频体积比图片大两个量级，带上传进度回调供界面显示百分比
 * @param file 已通过类型与大小校验的视频文件
 * @param onProgress 已上传百分比（0-100）回调，无法取得总长度时不触发
 * @param signal 取消信号，用户点「取消」或离开页面时中断上传
 */
export const uploadVideo = (
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post<ApiResult<UploadResult | null>>('/api/mgmt/upload/video', form, {
    signal,
    onUploadProgress: (e) => {
      if (!onProgress || !e.total) return
      onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}
