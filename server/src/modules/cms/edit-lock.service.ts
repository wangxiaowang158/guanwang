// 内容编辑锁 —— 同一条内容同一时刻只允许一位管理员编辑
//
// 为什么用租约而非数据库乐观锁：运营要的是「打开就知道谁在改、别白改半天」，
// 乐观锁只能在保存那一刻报冲突，前面填的内容就白费了。
// 租约 90 秒，编辑页每 30 秒续一次；关页、断网、浏览器崩溃都不需要显式解锁，到期自动释放。
//
// 存在 KV（配了 REDIS_URL 走 Redis，多实例共享）。KV 不可用时一律放行：
// 编辑锁是协作提示，不能因为缓存故障让整个后台改不了内容。
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common'
import { KV_STORE, type KvStore } from '../kv/kv-store.interface'
import type { CurrentAdminInfo } from '../../common/guards/admin.guard'

/** 租约时长：编辑页续约间隔的 3 倍，偶发一次续约失败不至于丢锁 */
export const EDIT_LOCK_TTL_MS = 90 * 1000

/** 条件写入被并发改动打断时的重试上限；正常只有本人几个标签页会撞上，几次足够 */
const MAX_CAS_ATTEMPTS = 3

/** 锁持有人信息，回给前端展示「谁在编辑」 */
export interface EditLockHolder {
  adminId: number
  name: string
  /** 开始编辑的时间（毫秒时间戳），续约不改它 */
  since: number
}

/** 加锁结果：acquired=false 时 holder 为当前占用人 */
export interface EditLockResult {
  acquired: boolean
  holder: EditLockHolder | null
}

/**
 * KV 里存的锁值：在持有人之外记下本人各标签页的续约到期时间
 * 多开标签页时关掉其中一个只摘掉它自己，其余标签页还在就不放锁，免得被别人趁隙接手
 */
interface StoredLock extends EditLockHolder {
  tabs: Record<string, number>
}

@Injectable()
export class EditLockService {
  private readonly logger = new Logger(EditLockService.name)

  constructor(@Inject(KV_STORE) private readonly kv: KvStore) {}

  /**
   * 加锁或续约
   * 本人已持有时续约（多开标签页也算本人）；他人持有且未过期时返回占用人，不抢锁
   */
  async acquire(channelKey: string, contentId: number, admin: CurrentAdminInfo, tabId: string): Promise<EditLockResult> {
    const key = this.keyOf(channelKey, contentId)
    const now = Date.now()
    const fresh: StoredLock = { adminId: admin.id, name: admin.name || admin.account, since: now, tabs: {} }
    fresh.tabs[tabId] = now + EDIT_LOCK_TTL_MS
    try {
      // 每次写入都带条件：无锁时「不存在才写」，有锁时「值没变才写」。
      // 读到之后锁恰好到期被别人抢到、或本人两个标签页同时续约，条件不成立就重读再判，不会覆盖对方
      for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
        const raw = await this.kv.get(key)
        if (raw === null) {
          if (await this.kv.setIfAbsent(key, JSON.stringify(fresh), EDIT_LOCK_TTL_MS)) return this.granted(fresh)
          continue
        }
        const stored = this.parse(raw)
        if (stored && stored.adminId !== admin.id) return { acquired: false, holder: this.publicOf(stored) }
        // 本人续约：开始时间不变，刷新本标签页并顺带摘掉早已不续约的标签页；脏数据则整条换成新锁
        const next = stored ? { ...stored, tabs: { ...this.liveTabs(stored.tabs, now), [tabId]: now + EDIT_LOCK_TTL_MS } } : fresh
        if (await this.kv.compareAndSet(key, raw, JSON.stringify(next), EDIT_LOCK_TTL_MS)) return this.granted(next)
      }
      // 连续几次都被并发改动打断：以最新状态如实回报，判不出就按放行（保存时服务端还会再校验）
      const latest = this.parse(await this.kv.get(key))
      if (!latest) return { acquired: true, holder: null }
      if (latest.adminId !== admin.id) return { acquired: false, holder: this.publicOf(latest) }
      // 本人的锁但本标签页没登记上：报持锁的话，别的标签页一释放就整把删掉，这页却以为还持着。
      // 不报持锁也不报占用人，前端据此保持当前状态，下次续约再登记
      if ((latest.tabs[tabId] ?? 0) > Date.now()) return this.granted(latest)
      return { acquired: false, holder: null }
    } catch (err) {
      this.warn('加锁', err)
      return { acquired: true, holder: null }
    }
  }

  /**
   * 解锁：只摘本人这个标签页；本人别的标签页还在续约就保留锁
   * 他人的锁不动（防止过期后被别人接手，又被旧页面误删）
   */
  async release(channelKey: string, contentId: number, admin: CurrentAdminInfo, tabId: string): Promise<void> {
    const key = this.keyOf(channelKey, contentId)
    try {
      // 删 / 写都比对读到的原值：本人锁到期后被别人接手，旧页面这次解锁不会误删对方的锁
      for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
        const raw = await this.kv.get(key)
        const stored = this.parse(raw)
        if (raw === null || stored?.adminId !== admin.id) return
        const now = Date.now()
        const rest = this.liveTabs(stored.tabs, now)
        delete rest[tabId]
        // 剩余标签页的租约本来多久到期就多久：按满 90 秒重写，已崩溃的标签页会让锁平白多挂一轮
        const ttl = Math.max(...Object.values(rest), now + 1) - now
        const done = Object.keys(rest).length
          ? await this.kv.compareAndSet(key, raw, JSON.stringify({ ...stored, tabs: rest }), ttl)
          : await this.kv.compareAndDel(key, raw)
        if (done) return
      }
    } catch (err) {
      this.warn('解锁', err)
    }
  }

  /**
   * 写操作前校验：内容正被他人编辑时拒绝
   * 不要求本人持锁：列表页的发布 / 置顶等快捷操作不经编辑页，也不该被自己挡住
   */
  async assertWritable(channelKey: string, contentId: number, admin: CurrentAdminInfo): Promise<void> {
    await this.assertManyWritable(channelKey, [contentId], admin)
  }

  /**
   * 批量写操作前校验（列表页删除 / 上下线等）：任一条被他人编辑即整批拒绝
   * 否则对方保存时会用表单里的旧状态覆盖回去，或因内容已删而白填一场
   */
  async assertManyWritable(channelKey: string, contentIds: number[], admin: CurrentAdminInfo): Promise<void> {
    const busy: string[] = []
    try {
      for (const id of contentIds) {
        const holder = this.parse(await this.kv.get(this.keyOf(channelKey, id)))
        if (holder && holder.adminId !== admin.id && !busy.includes(holder.name)) busy.push(holder.name)
      }
    } catch (err) {
      this.warn('校验', err)
      return
    }
    if (!busy.length) return
    const who = busy.map(n => `「${n}」`).join('、')
    throw new ConflictException(contentIds.length > 1
      ? `所选内容中有正被${who}编辑的，请待其完成后再操作`
      : `${who}正在编辑这条内容，请待其完成后再操作`)
  }

  private keyOf(channelKey: string, contentId: number): string {
    return `edit-lock:${channelKey}:${contentId}`
  }

  /** 解析锁值；格式不对视为无锁，免得一条脏数据把内容永久锁死（TTL 到期前） */
  private parse(raw: string | null): StoredLock | null {
    if (!raw) return null
    try {
      const v = JSON.parse(raw) as Partial<StoredLock>
      if (typeof v.adminId !== 'number' || typeof v.name !== 'string' || typeof v.since !== 'number') return null
      const tabs: Record<string, number> = {}
      if (v.tabs && typeof v.tabs === 'object') {
        for (const [id, exp] of Object.entries(v.tabs)) if (typeof exp === 'number') tabs[id] = exp
      }
      return { adminId: v.adminId, name: v.name, since: v.since, tabs }
    } catch {
      return null
    }
  }

  /** 只保留仍在租约内的标签页：浏览器崩溃等没发解锁的标签页不会一直占着名额 */
  private liveTabs(tabs: Record<string, number>, now: number): Record<string, number> {
    const live: Record<string, number> = {}
    for (const [id, exp] of Object.entries(tabs)) if (exp > now) live[id] = exp
    return live
  }

  /** 回给前端的持有人信息，不带标签页明细 */
  private publicOf(lock: StoredLock): EditLockHolder {
    return { adminId: lock.adminId, name: lock.name, since: lock.since }
  }

  private granted(lock: StoredLock): EditLockResult {
    return { acquired: true, holder: this.publicOf(lock) }
  }

  private warn(action: string, err: unknown): void {
    this.logger.warn(`编辑锁${action}失败，按无锁放行：${err instanceof Error ? err.message : String(err)}`)
  }
}
