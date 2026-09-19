// 栏目节点实体 —— 一棵树同时驱动三处：管理端侧边栏、前台导航菜单、前台栏目页区块
// 顶级节点对应一个前台页面（portalPath 非空时），子节点对应该页面的一个内容区块（anchor + layout）
import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { BlockLayout, ChannelType } from '../../common/enums'

@Entity('channel')
export class Channel {
  /** 主键。种子数据沿用原 mock 的 1001+ 编号，便于比对 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 父节点 id，顶级为 null */
  @Index()
  @Column({ type: 'int', nullable: true })
  parentId!: number | null

  /** 栏目标识，全局唯一，内容记录按此关联 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  key!: string

  /** 栏目名称。顶级为菜单名，子级同时充当前台区块标题 */
  @Column({ type: 'varchar', length: 64 })
  name!: string

  /** 栏目类型，取值见 CHANNEL_TYPE */
  @Column({ type: 'varchar', length: 20 })
  type!: ChannelType

  /** 管理端菜单图标名（ant-design-vue 图标组件名） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  icon!: string | null

  /** 排序值，同级内升序排列 */
  @Column({ type: 'int', default: 0 })
  sort!: number

  /** 内容表单启用的字段名数组，JSON 字符串存储 */
  @Column({ type: 'varchar', length: 1000, default: '[]' })
  formFields!: string

  /** 内容列表展示的列名数组，JSON 字符串存储 */
  @Column({ type: 'varchar', length: 1000, default: '[]' })
  listColumns!: string

  // ---------------- 栏目页 SEO（顶级节点使用） ----------------

  /** 页面 title */
  @Column({ type: 'varchar', length: 200, nullable: true })
  seoTitle!: string | null

  /** 页面 keywords */
  @Column({ type: 'varchar', length: 500, nullable: true })
  seoKeywords!: string | null

  /** 页面 description */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  seoDescription!: string | null

  // ---------------- 前台呈现（无值则不对外） ----------------

  /** 前台路由路径，如 /hvac。为空表示该栏目仅供管理端使用，不进前台菜单 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  portalPath!: string | null

  /** 区块锚点，子节点使用，前台菜单据此定位到页面内位置 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  anchor!: string | null

  /** 区块副标题，展示在 name 之下 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  subheading!: string | null

  /** 区块展示形态，取值见 BLOCK_LAYOUT */
  @Column({ type: 'varchar', length: 20, nullable: true })
  layout!: BlockLayout | null

  /** 页面 Hero 眉标题（顶级节点使用） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  heroEyebrow!: string | null

  /** 页面 Hero 主标题 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  heroTitle!: string | null

  /** 页面 Hero 描述 */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  heroDesc!: string | null

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
