// 站点基本信息实体 —— 单例表，固定 id=1
// 管理端「基本信息」与前台页头/页脚/联系区共用同一份数据，避免两边各存一套而失同步
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('site_config')
export class SiteConfig {
  /** 固定为 1，全表只保留一行 */
  @PrimaryColumn({ type: 'int' })
  id!: number

  /** 网站标题（浏览器标签与默认 TDK 的 title） */
  @Column({ type: 'varchar', length: 200, default: '' })
  webTitle!: string

  /** 全站默认关键词 */
  @Column({ type: 'varchar', length: 500, default: '' })
  keywords!: string

  /** 全站默认描述 */
  @Column({ type: 'varchar', length: 1000, default: '' })
  description!: string

  /** 首页主标语（前台 Hero 用，管理端暂未开放编辑） */
  @Column({ type: 'varchar', length: 200, default: '' })
  slogan!: string

  /** 首页副标语 */
  @Column({ type: 'varchar', length: 200, default: '' })
  subSlogan!: string

  /** 联系电话 */
  @Column({ type: 'varchar', length: 50, default: '' })
  phone!: string

  /** 官网域名 */
  @Column({ type: 'varchar', length: 200, default: '' })
  website!: string

  /** 招聘邮箱 */
  @Column({ type: 'varchar', length: 100, default: '' })
  recruitEmail!: string

  /** 商务邮箱 */
  @Column({ type: 'varchar', length: 100, default: '' })
  contactEmail!: string

  /** 办公地址 */
  @Column({ type: 'varchar', length: 200, default: '' })
  address!: string

  /** 地图经度 */
  @Column({ type: 'varchar', length: 32, default: '' })
  mapLng!: string

  /** 地图纬度 */
  @Column({ type: 'varchar', length: 32, default: '' })
  mapLat!: string

  /** 地图跳转链接 */
  @Column({ type: 'varchar', length: 500, default: '' })
  mapLink!: string

  /** 版权信息 */
  @Column({ type: 'varchar', length: 300, default: '' })
  copyright!: string

  /** ICP 备案号 */
  @Column({ type: 'varchar', length: 100, default: '' })
  icpCode!: string

  /** 公安备案号 */
  @Column({ type: 'varchar', length: 100, default: '' })
  policeCode!: string

  /** 页头 Logo 地址 */
  @Column({ type: 'varchar', length: 500, default: '' })
  logo!: string

  /** 页脚 Logo 地址 */
  @Column({ type: 'varchar', length: 500, default: '' })
  footerLogo!: string

  /** 微信公众号二维码地址 */
  @Column({ type: 'varchar', length: 500, default: '' })
  wechatQr!: string

  /** 网站模板：'1' 样式一 | '2' 样式二 */
  @Column({ type: 'varchar', length: 8, default: '1' })
  template!: string

  /** 首页 Hero 背景图地址 */
  @Column({ type: 'text', nullable: true })
  heroImage!: string | null

  /** 首页 Hero 背景视频地址，优先级高于背景图 */
  @Column({ type: 'text', nullable: true })
  heroVideo!: string | null

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}
