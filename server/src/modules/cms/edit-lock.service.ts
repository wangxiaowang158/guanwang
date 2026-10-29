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

@Injectable()
export class EditLockService {
  private readonly logger = new Logger(EditLockService.name)

  constructor(@Inject(KV_STORE) private readonly kv: KvStore) {}

  /**
   * 加锁或续约
   * 本人已持有时续约（多开标签页也算本人）；他人持有且未过期时返回占用人，不抢锁
   */
  async acquire(channelKey: string, contentId: number, admin: CurrentAdminInfo): Promise<EditLockResult> {
    const key = this.keyOf(channelKey, contentId)
    try {
      const holder = this.parse(await this.kv.get(key))
      if (holder && holder.adminId !== admin.id) return { acquired: false, holder }
      const mine: EditLockHolder = { adminId: admin.id, name: admin.name || admin.account, since: holder?.since ?? Date.now() }
      await this.kv.set(key, JSON.stringify(mine), EDIT_LOCK_TTL_MS)
      return { acquired: true, holder: mine }
    } catch (err) {
      this.warn('加锁', err)
      return { acquired: true, holder: null }
    }
  }

  /** 解锁：只删自己的锁，他人的锁不动（防止过期后被别人接手，又被旧页面误删） */
  async release(channelKey: string, contentId: number, admin: CurrentAdminInfo): Promise<void> {
    const key = this.keyOf(channelKey, contentId)
    try {
      const holder = this.parse(await this.kv.get(key))
      if (holder?.adminId === admin.id) await this.kv.del(key)
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
  private parse(raw: string | null): EditLockHolder | null {
    if (!raw) return null
    try {
      const v = JSON.parse(raw) as Partial<EditLockHolder>
      if (typeof v.adminId !== 'number' || typeof v.name !== 'string' || typeof v.since !== 'number') return null
      return { adminId: v.adminId, name: v.name, since: v.since }
    } catch {
      return null
    }
  }

  private warn(action: string, err: unknown): void {
    this.logger.warn(`编辑锁${action}失败，按无锁放行：${err instanceof Error ? err.message : String(err)}`)
  }
}
