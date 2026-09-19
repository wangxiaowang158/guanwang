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
 */
export const uploadImage = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post<ApiResult<UploadResult | null>>('/api/mgmt/upload/image', form)
}

/**
 * 上传视频，返回站内访问地址
 * 视频体积比图片大两个量级，带上传进度回调供界面显示百分比
 * @param file 已通过类型与大小校验的视频文件
 * @param onProgress 已上传百分比（0-100）回调，无法取得总长度时不触发
 */
export const uploadVideo = (file: File, onProgress?: (percent: number) => void) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post<ApiResult<UploadResult | null>>('/api/mgmt/upload/video', form, {
    onUploadProgress: (e) => {
      if (!onProgress || !e.total) return
      onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
}
