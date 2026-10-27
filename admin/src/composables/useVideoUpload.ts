// 视频选取与上传 composable —— 收敛「类型校验 + 大小校验 + 带进度上传 + 取消/重试」
// 与 useImageUpload 分开：两者体积上限差两个量级，白名单与提示文案也不同，
// 强行合并成一个带参数的通用版本，调用处反而要先想清楚传什么
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import axios from 'axios'
import { message } from 'ant-design-vue'
import { uploadVideo } from '@/api/upload'
import {
  UPLOAD_VIDEO_MAX_MB, UPLOAD_VIDEO_MAX_BYTES,
  UPLOAD_VIDEO_MIMES, UPLOAD_VIDEO_LABEL,
} from '@/config'

/** 上传失败的兜底提示 */
const UPLOAD_FAILED = '视频上传失败，可点「重试」再传一次'

/** 体积超限的响应码：后端 multer 与网关 nginx 都会返回它 */
const PAYLOAD_TOO_LARGE = 413

const TOO_LARGE_TIP = `视频大小不能超过 ${UPLOAD_VIDEO_MAX_MB}MB，请压缩后再传`

export function useVideoUpload() {
  const uploading = ref(false)
  /** 已上传百分比，0-100 */
  const progress = ref(0)
  /** 上次失败的文件，保留供「重试」直接重传，不必重新选择 */
  const failedFile = shallowRef<File | null>(null)
  /** 字节已传完、等待服务端校验落盘的阶段，界面显示「处理中」而不是卡在 100% */
  const processing = computed(() => uploading.value && progress.value >= 100)

  let controller: AbortController | null = null

  /**
   * 上传一个已通过校验的文件；成功返回地址，失败或取消返回 null
   * 每次请求持有自己的 controller：取消后立刻重传时，旧请求的回调晚到也只认自己，
   * 不会把新请求的进度、上传中状态与取消句柄清掉
   */
  const send = async (file: File): Promise<string | null> => {
    controller?.abort()
    const own = new AbortController()
    controller = own
    /** 本次请求是否仍是当前请求 */
    const current = () => controller === own
    uploading.value = true
    progress.value = 0
    failedFile.value = null
    try {
      const res = await uploadVideo(file, (p) => { if (current()) progress.value = p }, own.signal)
      // 已被新请求取代：结果作废，不弹提示、不回填地址
      if (!current()) return null
      if (res.data.code === PAYLOAD_TOO_LARGE) {
        message.error(TOO_LARGE_TIP)
        return null
      }
      if (res.data.code !== 200 || !res.data.data?.url) {
        message.error(res.data.message || UPLOAD_FAILED)
        failedFile.value = file
        return null
      }
      return res.data.data.url
    } catch (err) {
      // 用户主动取消不算失败，不弹错误也不提供重试；被新请求取代的旧请求同样静默
      if (axios.isCancel(err) || !current()) return null
      // 网关拦下的超限请求返回 HTML 413，走到这里而不是上面的业务码分支
      if (axios.isAxiosError(err) && err.response?.status === PAYLOAD_TOO_LARGE) {
        message.error(TOO_LARGE_TIP)
        return null
      }
      message.error(UPLOAD_FAILED)
      failedFile.value = file
      return null
    } finally {
      // 只有仍是当前请求才复位界面状态
      if (current()) {
        controller = null
        uploading.value = false
        progress.value = 0
      }
    }
  }

  /**
   * 校验并上传文件选择框里的视频
   * 类型必须在前端校验：accept 只约束选择框，用户仍可拖拽或改筛选条件绕过
   * @param input 触发 change 的 file 输入框，处理完会被清空以便重复选同一文件
   * @returns 上传成功返回视频地址，校验不通过、失败或取消返回 null
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
      message.error(TOO_LARGE_TIP)
      return null
    }
    return send(file)
  }

  /** 重传上次失败的文件 */
  const retry = (): Promise<string | null> =>
    failedFile.value ? send(failedFile.value) : Promise.resolve(null)

  /** 中断进行中的上传 */
  const cancel = () => controller?.abort()

  // 组件卸载（关弹窗、离开页面）时中断，避免请求在后台继续传完 100MB
  onBeforeUnmount(cancel)

  return { uploading, progress, processing, failedFile, pickAndUpload, retry, cancel }
}
