// 会员实体 —— 前台注册的官网会员账号
// 与管理员账号（admin_account）物理隔离，两套身份不共表、不共令牌
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { MEMBER_STATUS, type MemberStatus } from '../../common/enums'

@Entity('member')
export class Member {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 手机号，登录账号，唯一（软删除记录不占用唯一性，见 deletedAt 说明） */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  phone!: string

  /** 昵称 */
  @Column({ type: 'varchar', length: 50 })
  nickname!: string

  /** 邮箱，选填 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  email!: string | null

  /** 密码哈希（bcrypt），禁止明文；查询时默认不选出，见 service 的 select 白名单 */
  @Column({ type: 'varchar', length: 100 })
  passwordHash!: string

  /** 头像地址，选填 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar!: string | null

  /** 账号状态：normal 正常 / disabled 已禁用（禁用后不可登录） */
  @Column({ type: 'varchar', length: 20, default: MEMBER_STATUS.NORMAL })
  status!: MemberStatus

  /** 注册时的来源 IP */
  @Column({ type: 'varchar', length: 64, nullable: true })
  registerIp!: string | null

  /** 最后一次登录成功时间 */
  @Column({ type: 'datetime', nullable: true })
  lastLoginAt!: Date | null

  /** 连续登录失败次数，登录成功后归零 */
  @Column({ type: 'int', default: 0 })
  failedAttempts!: number

  /** 锁定截止时间，为空或已过期表示未锁定 */
  @Column({ type: 'datetime', nullable: true })
  lockedUntil!: Date | null

  /** 软删除时间，非空表示已删除；保留记录以维持反馈与日志的可追溯性 */
  @Index()
  @Column({ type: 'datetime', nullable: true })
  deletedAt!: Date | null

  /** 注册时间 */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
