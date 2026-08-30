// 会员登录日志实体 —— 登录审计，只读展示 + 按日期清理
// 账号不存在时 memberId 为空，loginAccount 保留输入值供排查
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import type { LoginFailReason, LoginMethod, LoginResult } from '../../common/enums'

@Entity('member_login_log')
export class MemberLoginLog {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 归属会员 id；账号不存在时为空 */
  @Index()
  @Column({ type: 'int', nullable: true })
  memberId!: number | null

  /** 登录时输入的账号（手机号），用于账号不存在场景的排查 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  loginAccount!: string | null

  /** 登录方式：password 账号密码 / smsCode 手机验证码 */
  @Column({ type: 'varchar', length: 20 })
  loginMethod!: LoginMethod

  /** 登录来源 IP */
  @Column({ type: 'varchar', length: 64, nullable: true })
  loginIp!: string | null

  /** 设备信息（User-Agent 截断保存） */
  @Column({ type: 'varchar', length: 300, nullable: true })
  deviceInfo!: string | null

  /** 登录结果：success / failure */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  result!: LoginResult

  /** 失败原因，成功时为空；仅后台可见，前台响应统一模糊提示 */
  @Column({ type: 'varchar', length: 30, nullable: true })
  failReason!: LoginFailReason | null

  /** 登录时间 */
  @Index()
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}
