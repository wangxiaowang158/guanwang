// 反馈记录实体 —— 合并原「访客留言」与新增「会员意见反馈」
// 一张表两种来源，用 source 区分：匿名咨询的回复仅后台可见，会员反馈的回复推送到前台个人中心
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { FEEDBACK_STATUS, type FeedbackSource, type FeedbackStatus, type FeedbackType } from '../../common/enums'

@Entity('feedback')
export class Feedback {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 来源类型：anonymous 匿名咨询 / member 会员反馈 */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  source!: FeedbackSource

  /** 归属会员 id；匿名来源为空。不建外键约束，避免会员软删除后记录不可读 */
  @Index()
  @Column({ type: 'int', nullable: true })
  memberId!: number | null

  /** 单位名称，选填（原留言字段） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  company!: string | null

  /** 提交人姓名；匿名来源由访客填写，会员来源取昵称快照 */
  @Column({ type: 'varchar', length: 50 })
  name!: string

  /** 联系电话 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null

  /** 反馈类型：产品建议 / 服务投诉 / 合作咨询 / 其他 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  feedbackType!: FeedbackType | null

  /** 反馈内容，按纯文本处理，不接受富文本 */
  @Column({ type: 'text' })
  content!: string

  /** 处理状态：pending / processing / replied / closed，流转规则见 FEEDBACK_STATUS_FLOW */
  @Index()
  @Column({ type: 'varchar', length: 20, default: FEEDBACK_STATUS.PENDING })
  status!: FeedbackStatus

  /** 提交时的来源 IP */
  @Column({ type: 'varchar', length: 64, nullable: true })
  submitIp!: string | null

  /** 提交来源页面路径 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  sourcePage!: string | null

  /** 提交时间 */
  @Index()
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
