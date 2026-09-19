// 访问日志实体 —— 前台每次板块访问落一行，供访问统计与数据仪表盘汇总
// 只存栏目 key 不存栏目名：后台改栏目名时历史统计不会被割成两段，展示名查询时从栏目表取
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('visit_log')
// 统计恒为「按日期范围 + 按栏目」聚合，联合索引覆盖这两个维度
@Index(['visitedDate', 'channelKey'])
export class VisitLog {
  @PrimaryGeneratedColumn()
  id!: number

  /** 被访问的一级栏目 key，对应 channel.key */
  @Column({ type: 'varchar', length: 64 })
  channelKey!: string

  /** 访客 IP，仅用于限流与异常排查，不对外展示 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  visitorIp!: string | null

  /** 访问统计口径的日期，按日聚合时直接分组，避免对时间戳做函数运算 */
  @Column({ type: 'varchar', length: 10 })
  visitedDate!: string

  /** 访问时间 */
  @CreateDateColumn()
  visitedAt!: Date
}
