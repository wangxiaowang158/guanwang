// 视频选取与上传 composable —— 收敛「类型校验 + 大小校验 + 带进度上传」三步
// 与 useImageUpload 分开：两者体积上限差两个量级，白名单与提示文案也不同，
// 强行合并成一个带参数的通用版本，调用处反而要先想清楚传什么
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { uploadVideo } from '@/api/upload'
import {
  UPLOAD_VIDEO_MAX_MB, UPLOAD_VIDEO_MAX_BYTES,
  UPLOAD_VIDEO_MIMES, UPLOAD_VIDEO_LABEL,
} from '@/config'

/** 上传失败的兜底提示 */
const UPLOAD_FAILED = '视频上传失败，请稍后重试'

/** 后端体积超限的响应码，消息为英文，需在此换成中文 */
const PAYLOAD_TOO_LARGE = 413

export function useVideoUpload() {
  const uploading = ref(false)
  /** 已上传百分比，0-100 */
  const progress = ref(0)

  /**
   * 校验并上传文件选择框里的视频
   * 类型必须在前端校验：accept 只约束选择框，用户仍可拖拽或改筛选条件绕过
   * @param input 触发 change 的 file 输入框，处理完会被清空以便重复选同一文件
   * @returns 上传成功返回视频地址，校验不通过或失败返回 null
   */
  const pickAndUpload = async (input: HTMLInputElement): Promise<string | null> => {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return null
    if (!(UPLOAD_VIDEO_MIMES as readonly string[]).includes(file.type)) {
      message.error(`请上传 ${UPLOAD_VIDEO_LABEL} 格式视频`)
      return null
    }
    if (file.size > UPLOAD_VIDEO_MAX_BYTES) {
      message.error(`视频大小不能超过 ${UPLOAD_VIDEO_MAX_MB}MB`)
      return null
    }
    uploading.value = true
    progress.value = 0
    try {
      const res = await uploadVideo(file, (percent) => {
        progress.value = percent
      })
      if (res.data.code === PAYLOAD_TOO_LARGE) {
        // 超限由 multer 拦下，消息是框架给的英文，换成与前端校验一致的中文文案
        message.error(`视频大小不能超过 ${UPLOAD_VIDEO_MAX_MB}MB`)
        return null
      }
      if (res.data.code !== 200 || !res.data.data?.url) {
        message.error(res.data.message || UPLOAD_FAILED)
        return null
      }
      return res.data.data.url
    } catch {
      message.error(UPLOAD_FAILED)
      return null
    } finally {
      uploading.value = false
      progress.value = 0
    }
  }

  return { uploading, progress, pickAndUpload }
}
