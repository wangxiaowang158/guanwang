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

  /**
   * 是否隐藏。仅顶级栏目有效：隐藏后管理端侧边栏与官网前台（菜单、页面、站点地图）都不再出现，
   * 数据保留，可随时取消隐藏；栏目管理页始终可见以便恢复
   */
  @Column({ type: 'boolean', default: false })
  hidden!: boolean

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

  /**
   * 菜单挂靠：该顶级页面在导航里归到哪个顶级栏目（填其 key）之下，自身路径不变
   * 用于「主营业务」下挂三个业务页、「智慧能源解决方案」下挂各子智能体页这类一页一栏目的情形；
   * 后台可改，服务层校验目标须为未挂靠的顶级页面（导航只有两层）
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  menuParent!: string | null

  /** 超级下拉菜单分组名，子节点使用；同组子项在菜单里归为一列 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  menuGroup!: string | null

  /** 超级下拉菜单里该项下方的一句说明 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  menuDesc!: string | null

  /** 页面 Hero 眉标题（顶级节点使用） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  heroEyebrow!: string | null

  /** 页面 Hero 主标题 */
  @Column({ type: 'varchar', length: 200, nullable: true })
  heroTitle!: string | null

  /** 页面 Hero 描述 */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  heroDesc!: string | null

  /** 页面 Hero 背景图（顶级节点使用）；为空时回落 `banner-<key>` 栏目的封面 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  heroBg!: string | null

  /** 页面 Hero 背景视频（静音循环播放，heroBg 作首帧）；为空则只显示背景图 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  heroVideo!: string | null

  /**
   * 外链地址（仅 http/https）。有值时该栏目在导航里是一个外部链接，新窗口打开，
   * 不对应站内页面（如「小鹿爱家技术服务」）；与 portalPath 二选一
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  externalUrl!: string | null

  /** 区块底色（区块子栏目使用），取值见 BLOCK_TONES；null 同 auto */
  @Column({ type: 'varchar', length: 16, nullable: true })
  blockTone!: string | null

  /** 区块背景图，blockTone 为 image 时生效 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  blockBg!: string | null

  /** 区块每行列数（2/3/4）；null 为展示形态默认 */
  @Column({ type: 'tinyint', nullable: true })
  blockColumns!: number | null

  /** 区块标题对齐（center / left）；null 为模板默认 */
  @Column({ type: 'varchar', length: 8, nullable: true })
  headingAlign!: string | null

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
