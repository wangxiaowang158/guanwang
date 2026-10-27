// 侧边栏「待处理留言」角标 —— 新线索不用进页面就能看到
// 取数走留言列表接口（pageSize=1 只拿 total），而非看板指标接口：
// 指标接口要「数据看板」权限，只授了留言权限的管理员也该看到角标
import { ref } from 'vue'
import { getFeedbackList } from '@/api/feedback'

/** 两次刷新的最短间隔：路由切换很频繁，不必每次都打接口 */
const MIN_INTERVAL_MS = 30_000

// 模块级单例：侧边栏只有一个，处理完留言后列表页可主动刷新它
const pending = ref(0)
let lastAt = 0
let inflight: Promise<void> | null = null

/**
 * 刷新待处理数
 * @param force 忽略节流（处理完一条后立即刷新）
 */
async function refresh(force = false): Promise<void> {
  if (inflight) return inflight
  if (!force && Date.now() - lastAt < MIN_INTERVAL_MS) return
  inflight = (async () => {
    try {
      const res = await getFeedbackList({ status: 'pending', page: 1, pageSize: 1 })
      if (res.data.code === 200 && res.data.data) pending.value = res.data.data.total
    } catch {
      // 角标取不到不影响使用，保留上次的值
    } finally {
      lastAt = Date.now()
      inflight = null
    }
  })()
  return inflight
}

export function usePendingFeedback() {
  return { pending, refresh }
}
