// 图片失效登记 —— 列表里多张图各自可能挂掉，按地址记录失败，模板据此回退
// 与 SafeImage 的分工：SafeImage 用于「挂了就显示占位块」的配图；
// 这里用于「挂了就换别的呈现」的场景（Logo 回退为文字、封面直接不显示），
// 占位块在这些位置反而像故障
import { reactive } from 'vue'

/**
 * 创建一组图片失效记录
 * @returns isBroken 判断某地址是否已失败；markBroken 作为 img 的 @error 处理
 */
export function useBrokenImages() {
  const broken = reactive(new Set<string>())
  return {
    /** 有地址且未失败时才应渲染 img */
    usable: (src?: string | null): src is string => !!src && !broken.has(src),
    markBroken: (src?: string | null) => {
      if (src) broken.add(src)
    },
  }
}
