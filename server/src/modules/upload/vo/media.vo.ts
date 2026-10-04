// 素材库响应结构
/** 素材类型 */
export type MediaType = 'image' | 'video' | 'other'

/** 素材列表项 */
export interface MediaItemVo {
  /** 站内访问地址，同时作为删除与选用时的唯一标识 */
  url: string
  /** 磁盘文件名 */
  name: string
  /** 小写扩展名，含点 */
  ext: string
  /** 类型分类，前端据此决定用图片还是视频渲染预览 */
  type: MediaType
  /** 字节数 */
  size: number
  /** 修改时间毫秒值 */
  mtime: number
  /** 所属月份分桶目录，落在根目录时为空串 */
  bucket: string
  /** 是否仍被内容或站点配置引用；被引用的素材不允许删除 */
  referenced: boolean
  /**
   * 是否在 24 小时保护期内
   * 刚上传但内容还没保存的文件此时查不到引用，标出来避免运营误判为垃圾文件
   */
  recent: boolean
}

/** 素材库整体统计，取全量而非当前筛选结果 */
export interface MediaStatVo {
  total: number
  image: number
  video: number
  other: number
  /** 无人引用且已过保护期的文件数，即可安全清理的量 */
  unused: number
  /** 全部素材合计字节数 */
  totalSize: number
  /** 可清理部分合计字节数 */
  unusedSize: number
}
