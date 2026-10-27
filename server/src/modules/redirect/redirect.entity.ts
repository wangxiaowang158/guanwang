// 跳转规则 —— 改版或改链接后，旧地址 301 到新地址，保住搜索引擎已收录的权重与外部引用
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('redirect_rule')
export class RedirectRule {
  @PrimaryGeneratedColumn()
  id!: number

  /** 旧地址：规整后的站内路径（小写、无尾斜杠、无查询串），精确匹配 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 300 })
  fromPath!: string

  /** 新地址：站内路径（/ 开头）或 http(s) 绝对地址 */
  @Column({ type: 'varchar', length: 500 })
  toUrl!: string

  /** 301 永久（改版、改链接）或 302 临时（活动页临时导流） */
  @Column({ type: 'smallint', default: 301 })
  statusCode!: number

  /** 是否启用 */
  @Column({ type: 'boolean', default: true })
  enabled!: boolean

  /** 备注：为什么加这条，日后清理时有据可查 */
  @Column({ type: 'varchar', length: 100, default: '' })
  remark!: string

  /** 命中次数：长期为 0 的规则可以放心删 */
  @Column({ type: 'int', default: 0 })
  hits!: number

  /** 最近命中时间 */
  @Column({ type: 'datetime', nullable: true })
  lastHitAt!: Date | null

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
