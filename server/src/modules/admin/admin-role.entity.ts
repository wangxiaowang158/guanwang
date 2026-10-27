// 管理员角色 —— 一组可复用的菜单权限，如「内容编辑」「市场运营」
// 账号的最终权限 = 所属角色的权限 ∪ 账号单独勾选的权限：
// 人多时按角色统一授权，个别人再单独补几项，改角色即全员生效，不必逐个账号去勾
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('admin_role')
export class AdminRole {
  @PrimaryGeneratedColumn()
  id!: number

  /** 角色名，全表唯一 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  name!: string

  /** 角色授予的一级菜单名 JSON 数组，取值口径与 admin.perms 一致 */
  @Column({ type: 'varchar', length: 1000, default: '[]' })
  perms!: string

  /** 说明 */
  @Column({ type: 'varchar', length: 200, default: '' })
  remark!: string

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
