// 新留言推送配置（单例，id 固定 1）
// 不放进 site_config：那张表会经公开接口整行下发到官网，而 webhook 地址里含机器人密钥
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm'

@Entity('notify_config')
export class NotifyConfig {
  @PrimaryColumn({ type: 'int' })
  id!: number

  /** 群机器人 webhook 地址；空串表示未在后台配置，回落环境变量 */
  @Column({ type: 'varchar', length: 500, default: '' })
  webhookUrl!: string

  /** 机器人类型：wecom / dingtalk / feishu */
  @Column({ type: 'varchar', length: 20, default: 'wecom' })
  type!: string

  @UpdateDateColumn()
  updatedAt!: Date
}
