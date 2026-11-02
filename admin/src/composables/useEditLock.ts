// 内容编辑锁：进入编辑页加锁并每 30 秒续约，离开时解锁
// 被他人占用时 lockedBy 有值，页面据此转只读并提示「谁在编辑」；之后每次续约顺带探测，
// 对方离开（解锁或租约到期）即自动拿到锁、重新载入最新内容并恢复可编辑，不必刷新页面；
// 本页有未保存修改（断网 / 休眠超过租约后锁被接手）时先确认，不静默覆盖。
// 解锁失败不处理：服务端租约 90 秒后自动释放
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Modal } from 'ant-design-vue'
import { lockContent, unlockContent, type EditLockHolder } from '@/api/cms'

/** 续约间隔：服务端租约 90 秒的三分之一，偶尔丢一次请求不至于丢锁 */
const RENEW_INTERVAL_MS = 30 * 1000

/**
 * 本人有未保存修改时，问一句再重新载入
 * 断网或休眠超过租约后锁会被别人接手，本人改到一半的内容还在页面上，不能不打招呼就覆盖
 */
function confirmReload(): Promise<boolean> {
  return new Promise(resolve => {
    Modal.confirm({
      title: '内容可能已被他人修改',
      content: '你中途失去过编辑权，期间他人可能已保存。载入最新内容会丢弃你未保存的修改；保留则以你的修改为准，保存时会覆盖他人的修改。',
      okText: '载入最新内容',
      cancelText: '保留我的修改',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}

/**
 * @param onRegain 对方离开、本人拿到锁时调用，用于重新载入最新内容
 * @param isDirty 本页是否有未保存修改；有则重新载入前先确认
 */
export function useEditLock(onRegain?: () => Promise<void> | void, isDirty?: () => boolean) {
  /** 当前占用人；为 null 表示本人可编辑（含加锁请求失败时放行） */
  const lockedBy = ref<EditLockHolder | null>(null)
  let target: { channelKey: string; id: number } | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let held = false
  // 每次 start / stop 自增：请求在途时页面已离开或换了目标，回来的结果作废
  let epoch = 0
  // 组件已卸载：之后再调 start（详情加载期间就离开了页面）一律不加锁、不建定时器
  let disposed = false
  // 页面曾进往返缓存：离开时已解锁，期间别人可能改过，回来重新拿到锁时须按「失而复得」重新载入
  let lostOnHide = false
  // 本编辑页实例标识：同一管理员多开标签页时，关掉一页只摘它自己，不放掉整把锁
  // 不用 crypto.randomUUID：它只在 HTTPS / localhost 下存在，内网 http 部署会直接报错；只需互不相同，不需不可猜
  const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  async function tryLock(): Promise<void> {
    if (!target) return
    const my = epoch
    const { channelKey, id } = target
    try {
      const res = await lockContent(channelKey, id, tabId)
      if (my !== epoch) {
        // 请求在途时已 stop：服务端这把锁已拿到却没人续约，立即补解，免得挡别人 90 秒
        if (res.data.code === 200 && res.data.data?.acquired) void unlockContent(channelKey, id, tabId).catch(() => {})
        return
      }
      // 接口异常（非 200）按放行处理：编辑锁是协作提示，保存时服务端还会再校验
      if (res.data.code !== 200 || !res.data.data) {
        lockedBy.value = null
        return
      }
      // 没拿到锁也没有占用人：服务端并发冲突判不出（本人另一标签页同时续约），保持现状等下次续约。
      // 若在这里清掉只读 / 往返缓存标记，下次真拿到锁时就不会重新载入，页面上的旧数据会覆盖他人的保存
      if (!res.data.data.acquired && !res.data.data.holder) return
      const wasLocked = !!lockedBy.value || lostOnHide
      lostOnHide = false
      held = res.data.data.acquired
      lockedBy.value = held ? null : res.data.data.holder
      // 从只读转为可编辑：对方期间可能已保存，页面上是旧数据，须重新载入再让本人改
      if (wasLocked && held && (!isDirty?.() || await confirmReload())) await onRegain?.()
    } catch {
      // 网络抖动：保持现状，下次续约再试
    }
  }

  /**
   * 开始占用某条内容；新建内容（无 id）不加锁
   * @returns 首次加锁的结果已写入 lockedBy
   */
  async function start(channelKey: string, id: number | undefined): Promise<void> {
    stop()
    // 已卸载：详情接口在离开页面后才返回，此时加锁就再也没人解、没人停续约
    if (disposed || !id) return
    const my = epoch
    target = { channelKey, id }
    await tryLock()
    // 首次加锁期间页面已离开或又调了 start：不再建定时器，否则卸载后永远清不掉
    if (my !== epoch) return
    timer = setInterval(() => void tryLock(), RENEW_INTERVAL_MS)
  }

  /** 停止续约并释放本人的锁 */
  function stop(): void {
    epoch++
    if (timer) clearInterval(timer)
    timer = null
    if (target && held) void unlockContent(target.channelKey, target.id, tabId).catch(() => {})
    target = null
    held = false
  }

  /**
   * 关页 / 刷新：组件不走卸载，只能在这里补解，否则锁要挂满 90 秒租约
   * 不清 target / 定时器：页面若从往返缓存恢复，下次续约会重新拿回锁
   */
  function onPageHide(): void {
    if (target && held) void unlockContent(target.channelKey, target.id, tabId, true).catch(() => {})
  }

  /**
   * 从往返缓存恢复：离开时已解锁，本地却还当自己持锁，若干等下次续约，
   * 最多 30 秒里页面可编辑而服务端无锁，且期间他人的保存不会被载入。立即按失锁处理并重新加锁
   */
  function onPageShow(e: PageTransitionEvent): void {
    if (!e.persisted || !target) return
    held = false
    lostOnHide = true
    void tryLock()
  }

  onMounted(() => {
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
  })
  onBeforeUnmount(() => {
    disposed = true
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('pageshow', onPageShow)
    stop()
  })

  return { lockedBy, start, stop }
}

/** 占用提示文案：「张三 正在编辑（14:05 开始）…」 */
export function lockedTip(holder: EditLockHolder): string {
  const d = new Date(holder.since)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `「${holder.name}」正在编辑这条内容（${hm} 开始），当前为只读。对方离开后会自动恢复可编辑，无需刷新。`
}
