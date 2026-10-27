// 媒体地址判定：图集等只存一列地址的位置，靠扩展名区分图片与视频

/** 浏览器可直接用 video 标签播放的扩展名，与后台视频上传白名单（mp4/webm/ogg）一致 */
const VIDEO_EXT = /\.(mp4|webm|ogv|ogg)(?:[?#]|$)/i

/**
 * 地址是否指向视频文件
 * @param url 资源地址，允许带查询串或锚点
 */
export const isVideoUrl = (url: string): boolean => VIDEO_EXT.test(url)
