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

  /**
   * 密码最后变更时刻的 Unix 秒
   * 用于让改密前签发的令牌立即失效：令牌载荷带签发时的该值，
   * 守卫比对不一致即拒绝。不存 Date 而存整数，是为了与 JWT 载荷里的
   * 数字直接比较，避免时区与毫秒精度带来的边界歧义。
   * 默认 0：存量账号未改过密码，而旧令牌载荷里也没有该字段（按 0 处理），
   * 两边相等，故加列后存量令牌不会被误踢，可平滑上线
   */
  @Column({
    type: 'bigint',
    default: 0,
    // MySQL 的 bigint 经驱动取出是字符串，直接与载荷里的数字比较会恒不相等，
    // 导致每个请求都被判成「密码已变更」而全员登出。此处强制收成数字
    transformer: {
      to: (v: number) => v,
      from: (v: string | number | null) => Number(v ?? 0),
    },
  })
  pwdChangedAt!: number

  /** 创建时间 */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
