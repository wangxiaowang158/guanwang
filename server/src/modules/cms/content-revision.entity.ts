// 内容历史版本 —— 每次保存前把旧值整行快照下来，误改可回滚
// 快照存 JSON 而非按列镜像 content：content 是宽表，列还在增加，镜像表每加一列都要跟着迁移，
// 漏一次就是「回滚后某个字段丢了」；JSON 快照天然跟随实体字段
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('content_revision')
@Index(['contentId', 'id'])
export class ContentRevision {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 所属内容 id */
  @Column({ type: 'int' })
  contentId!: number

  /** 所属栏目 key，权限校验与按栏目清理用 */
  @Index()
  @Column({ type: 'varchar', length: 64 })
  channelKey!: string

  /** 快照时的标题，列表里直接显示，不必解析整份 JSON */
  @Column({ type: 'varchar', length: 300, default: '' })
  title!: string

  /** 内容字段快照（JSON），见 ContentService.snapshotOf */
  @Column({ type: 'text' })
  snapshot!: string

  /** 操作人显示名；脚本写入等无登录态场景为空串 */
  @Column({ type: 'varchar', length: 64, default: '' })
  operator!: string

  /** 快照时间 */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}
