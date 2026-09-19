// 图片选取与上传 composable —— 收敛「类型校验 + 大小校验 + 上传取地址」三步
// 图片上传按钮与富文本插图共用，避免两处各写一份校验而限制不一致
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { uploadImage } from '@/api/upload'
import {
  UPLOAD_MAX_MB, UPLOAD_MAX_BYTES,
  UPLOAD_IMAGE_MIMES, UPLOAD_IMAGE_LABEL,
} from '@/config'

/** 上传失败的兜底提示 */
const UPLOAD_FAILED = '图片上传失败，请稍后重试'

export function useImageUpload() {
  const uploading = ref(false)

  /**
   * 校验并上传文件选择框里的图片
   * 类型必须在前端校验：accept 只约束选择框，用户仍可拖拽或改筛选条件绕过
   * @param input 触发 change 的 file 输入框，处理完会被清空以便重复选同一文件
   * @returns 上传成功返回图片地址，校验不通过或失败返回 null
   */
  const pickAndUpload = async (input: HTMLInputElement): Promise<string | null> => {
    const file = input.files?.[0]
    input.value = ''
    if (!file) return null
    if (!(UPLOAD_IMAGE_MIMES as readonly string[]).includes(file.type)) {
      message.error(`请上传 ${UPLOAD_IMAGE_LABEL} 格式图片`)
      return null
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      message.error(`图片大小不能超过 ${UPLOAD_MAX_MB}MB`)
      return null
    }
    uploading.value = true
    try {
      const res = await uploadImage(file)
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
    }
  }

  return { uploading, pickAndUpload }
}
