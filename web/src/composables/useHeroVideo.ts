// 首屏背景视频开关 composable —— 决定当前环境该不该播 Hero 背景视频
// 手机端一律不播：背景视频纯装饰，却要吃掉几十 MB 流量，
// 且 iOS 低电量模式会直接拒绝自动播放，播不出来还占着一层黑底
import { onBeforeUnmount, ref } from 'vue'

/** 视口宽度阈值，与 Tailwind md 断点一致 */
const MOBILE_MAX_WIDTH = 767

export function useHeroVideo() {
  /** 是否窄屏或用户要求减少动效 */
  const blocked = ref(false)

  // matchMedia 比监听 resize 便宜：只在跨越断点时回调，不是每帧都算
  const query = typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px), (prefers-reduced-motion: reduce)`)
    : null

  /** 视频源已加载失败；单独记，跨断点回调重算 blocked 时不能把它冲掉 */
  let failed = false

  const sync = () => {
    blocked.value = failed || !!query?.matches
  }
  sync()
  query?.addEventListener('change', sync)
  onBeforeUnmount(() => query?.removeEventListener('change', sync))

  /**
   * 视频源加载失败：作为 video 的 @error 处理。
   * 置位后与 blocked 同样处理，首屏回落到背景图，不留一层黑底
   */
  const markFailed = () => {
    failed = true
    blocked.value = true
  }

  return { blocked, markFailed }
}
