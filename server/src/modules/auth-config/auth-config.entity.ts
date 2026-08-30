// 注册登录配置实体 —— 单例表，固定 id=1
// 保存后即时生效，前台登录注册页按此配置渲染
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('auth_config')
export class AuthConfig {
  /** 单例主键，固定为 1 */
  @PrimaryColumn({ type: 'int' })
  id!: number

  /** 是否开放注册；关闭后前台隐藏注册入口，已注册会员仍可登录 */
  @Column({ type: 'boolean', default: true })
  registerOpen!: boolean

  /** 是否允许账号密码登录 */
  @Column({ type: 'boolean', default: true })
  allowPasswordLogin!: boolean

  /** 是否允许手机验证码登录 */
  @Column({ type: 'boolean', default: true })
  allowSmsLogin!: boolean

  /** 密码最小长度，前后端同步校验，后端为准 */
  @Column({ type: 'int', default: 8 })
  passwordMinLength!: number

  /** 密码是否必须包含字母与数字组合 */
  @Column({ type: 'boolean', default: true })
  passwordRequireMixed!: boolean

  /** 图形验证码触发阈值：连续失败达此次数后强制要求图形验证码 */
  @Column({ type: 'int', default: 3 })
  captchaThreshold!: number

  /** 登录失败锁定阈值：连续失败达此次数后临时锁定账号 */
  @Column({ type: 'int', default: 5 })
  lockThreshold!: number

  /** 锁定持续时长（分钟） */
  @Column({ type: 'int', default: 15 })
  lockMinutes!: number

  /** 更新时间 */
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date
}

/** 单例固定主键 */
export const AUTH_CONFIG_ID = 1

/** 默认配置，首次启动时写入 */
export const AUTH_CONFIG_DEFAULTS = {
  id: AUTH_CONFIG_ID,
  registerOpen: true,
  allowPasswordLogin: true,
  allowSmsLogin: true,
  passwordMinLength: 8,
  passwordRequireMixed: true,
  captchaThreshold: 3,
  lockThreshold: 5,
  lockMinutes: 15,
}
