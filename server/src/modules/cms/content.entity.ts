// 内容记录实体 —— 一张宽表承载所有栏目的内容
// 各栏目按自己的 formFields 取用其中一部分字段，未启用的字段留空，避免每个栏目建一张表
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('content')
export class Content {
  /** 主键 */
  @PrimaryGeneratedColumn()
  id!: number

  /** 所属栏目 key，对应 channel.key */
  @Index()
  @Column({ type: 'varchar', length: 64 })
  channelKey!: string

  /** 标题 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  title!: string | null

  /** 名称（产品类栏目用，与 title 二选一） */
  @Column({ type: 'varchar', length: 300, nullable: true })
  name!: string | null

  /** 副标题 */
  @Column({ type: 'varchar', length: 300, nullable: true })
  subtitle!: string | null

  /** 关键词 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  keywords!: string | null

  /** 摘要描述，前台列表条目的说明文字 */
  @Column({ type: 'text', nullable: true })
  description!: string | null

  /** 简介 */
  @Column({ type: 'text', nullable: true })
  intro!: string | null

  /** 正文（富文本） */
  @Column({ type: 'text', nullable: true })
  content!: string | null

  /** 封面图地址 */
  @Column({ type: 'text', nullable: true })
  cover!: string | null

  /** 视频地址，前台视频板块的播放源；封面图同时充当 poster */
  @Column({ type: 'text', nullable: true })
  video!: string | null

  /** 白底图地址（合作伙伴 Logo 等场景） */
  @Column({ type: 'text', nullable: true })
  whiteCover!: string | null

  /** 附件地址 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  file!: string | null

  /** 外部跳转链接 */
  @Column({ type: 'varchar', length: 500, nullable: true })
  link!: string | null

  /** 分类，前台条目的标签文字 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null

  /** 图标名（首页业务/服务类板块使用，取值为前台图标组件名） */
  @Column({ type: 'varchar', length: 64, nullable: true })
  icon!: string | null

  /** 品牌 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  brand!: string | null

  /** 作者 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  author!: string | null

  /** 来源 */
  @Column({ type: 'varchar', length: 100, nullable: true })
  source!: string | null

  /** 排序值，同栏目内降序排列（值大者靠前） */
  @Column({ type: 'int', default: 0 })
  sort!: number

  /** 是否置顶 */
  @Column({ type: 'boolean', default: false })
  isTop!: boolean

  /** 发布时间，可由管理端指定，未指定时取创建时间 */
  @Index()
  @Column({ type: 'datetime', nullable: true })
  publishAt!: Date | null

  /** 创建时间 */
  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
