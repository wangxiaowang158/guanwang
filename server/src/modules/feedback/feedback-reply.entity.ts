// 反馈回复实体 —— 一条反馈可有多条回复，按时间正序展示
// visibleToMember 决定回复是否推送到前台个人中心：匿名来源的回复仅作后台处理留痕
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('feedback_reply')
export class FeedbackReply {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 归属反馈 id */
  @Index()
  @Column({ type: 'int' })
  feedbackId!: number

  /** 回复内容，纯文本 */
  @Column({ type: 'text' })
  content!: string

  /** 回复人标识（管理员账号或姓名快照） */
  @Column({ type: 'varchar', length: 50, nullable: true })
  repliedBy!: string | null

  /** 是否对会员可见：会员来源为 true，匿名来源为 false */
  @Column({ type: 'boolean', default: false })
  visibleToMember!: boolean

  /** 回复时间 */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}
