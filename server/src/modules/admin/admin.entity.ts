// 后台管理员实体 —— 与会员表完全分离，双身份隔离红线
// 权限存「一级菜单名」数组（与 admin 端 constants/menu.ts 同源），JSON 字符串落库：
// SQLite 无原生数组类型，用 varchar 存 JSON 可保证与 MySQL 行为一致
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('admin')
export class Admin {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 登录账号，全表唯一 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  account!: string

  /** 显示名称 */
  @Column({ type: 'varchar', length: 50 })
  name!: string

  /** 密码哈希（bcrypt），绝不返回给前端 */
  @Column({ type: 'varchar', length: 100 })
  passwordHash!: string

  /** 已授权的一级菜单名 JSON 数组，如 ["数据仪表盘","新闻资讯"] */
  @Column({ type: 'varchar', length: 1000, default: '[]' })
  perms!: string

  /** 是否超级管理员：不受权限清单限制，且不可被停用或删除 */
  @Column({ type: 'boolean', default: false })
  isSuper!: boolean

  /** 是否已绑定微信 */
  @Column({ type: 'boolean', default: false })
  wechatBound!: boolean

  /** 创建时间 */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
