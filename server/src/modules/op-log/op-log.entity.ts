// 管理端操作日志实体 —— 记录后台的写操作，只读展示 + 按日期清理
// 由全局拦截器统一写入，不在各业务 service 里散落埋点
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import type { OpLogResult } from '../../common/enums'

@Entity('admin_op_log')
export class AdminOpLog {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 操作人 id */
  @Index()
  @Column({ type: 'int' })
  adminId!: number

  /**
   * 操作人账号与姓名的快照
   * 不做外键关联：账号改名或被删后，日志仍须显示当时是谁操作的
   */
  @Column({ type: 'varchar', length: 50 })
  adminAccount!: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  adminName!: string | null

  /** 操作说明，如「保存内容」；未收录的路径回落为「方法 + 路径」 */
  @Column({ type: 'varchar', length: 100 })
  action!: string

  /** 所属模块，如「内容管理」，用于后台按模块筛选 */
  @Index()
  @Column({ type: 'varchar', length: 50 })
  module!: string

  /** HTTP 方法 */
  @Column({ type: 'varchar', length: 10 })
  method!: string

  /** 请求路径，不含查询串 */
  @Column({ type: 'varchar', length: 200 })
  path!: string

  /**
   * 请求参数快照（JSON），密码一类敏感字段已脱敏，超长截断
   * 用 text 而非 json 列：两种方言都支持，且不需要按字段查询
   */
  @Column({ type: 'text', nullable: true })
  params!: string | null

  /** 操作来源 IP */
  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null

  /** 操作结果：success / failure */
  @Index()
  @Column({ type: 'varchar', length: 20 })
  result!: OpLogResult

  /** 失败原因，成功时为空 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  errorMessage!: string | null

  /** 操作时间 */
  @Index()
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}
