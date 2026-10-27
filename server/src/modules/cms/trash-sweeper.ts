// 回收站定时清理 —— 超过保留期的已删除内容彻底删除
// 不引入 @nestjs/schedule：只有这一个周期任务，一个 unref 的定时器足够，少一个依赖少一处升级面
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { ContentService, TRASH_RETENTION_DAYS } from './content.service'

/** 清理间隔：保留期以天计，6 小时扫一次足够及时 */
const SWEEP_INTERVAL_MS = 6 * 3600 * 1000

@Injectable()
export class TrashSweeper implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TrashSweeper.name)
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly contents: ContentService) {}

  onApplicationBootstrap(): void {
    // 启动时先扫一次：进程长期不重启之外，也覆盖「刚重启、定时器还没到点」的窗口
    void this.sweep()
    // unref 让定时器不阻止进程退出，否则 CLI 脚本与冒烟脚本会挂住不结束
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS)
    this.timer.unref()
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  private async sweep(): Promise<void> {
    try {
      const n = await this.contents.purgeExpiredTrash()
      if (n) this.logger.log(`回收站清理：彻底删除 ${n} 条超过 ${TRASH_RETENTION_DAYS} 天的内容`)
    } catch (err) {
      // 清理失败不影响业务，下个周期再试
      this.logger.warn(`回收站清理失败：${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
