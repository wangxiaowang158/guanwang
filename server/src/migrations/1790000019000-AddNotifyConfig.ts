// 新留言推送配置表 —— 群机器人 webhook 由后台可配
//
// 背景：原先只能写在服务器环境变量 FEEDBACK_NOTIFY_WEBHOOK 里，换群或换机器人要找运维改配置重启。
// 单独建表而不并入 site_config：那张表会经公开接口整行下发，webhook 地址含机器人密钥。
// 后台未配置时（webhookUrl 为空）仍回落环境变量，存量部署行为不变
import { Table } from 'typeorm'
import type { MigrationInterface, QueryRunner } from 'typeorm'

const TABLE = 'notify_config'

export class AddNotifyConfig1790000019000 implements MigrationInterface {
  name = 'AddNotifyConfig1790000019000'

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(TABLE)) return
    await queryRunner.createTable(
      new Table({
        name: TABLE,
        columns: [
          // 单例表，主键固定为 1，不自增
          { name: 'id', type: 'int', isPrimary: true },
          { name: 'webhookUrl', type: 'varchar', length: '500', default: "''", comment: '群机器人 webhook 地址' },
          { name: 'type', type: 'varchar', length: '20', default: "'wecom'", comment: '机器人类型 wecom/dingtalk/feishu' },
          { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', comment: '更新时间' },
        ],
      }),
    )
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable(TABLE)) await queryRunner.dropTable(TABLE)
  }
}
