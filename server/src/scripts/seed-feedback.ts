// 反馈种子数据 —— 将原 admin/mock/message.js 的留言样例迁为匿名反馈
// 用法：npx ts-node src/scripts/seed-feedback.ts
// 幂等：按「姓名 + 提交时间」判重，重复执行不会产生副本
import 'reflect-metadata'
import { config } from 'dotenv'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
// 仅类型引入：编译期擦除，不会提前触发配置模块求值
import type { FeedbackType } from '../common/enums'

config()

/** 原留言样例。type 为原中文分类，映射到 FEEDBACK_TYPE 的四个枚举值 */
const LEGACY_MESSAGES = [
  { company: '上海云剪智能科技有限公司', name: '郑再福', phone: '18190040891', content: '希望了解贵公司综合能源服务方案', type: '综合能源', submitTime: '2026-05-25 23:28:02', ip: '61.171.203.33', page: '联系我们' },
  { company: '山西楚泷新能源有限公司', name: '孙志成', phone: '18734164111', content: '咨询合同能源管理合作', type: '合同能源', submitTime: '2026-04-28 02:23:20', ip: '223.12.237.79', page: '综合能源节能' },
  { company: '视昀深圳科技有限公司', name: '邓玉玲', phone: '13530768805', content: '产品报价咨询', type: '暖通产品', submitTime: '2026-01-27 05:20:57', ip: '61.145.163.252', page: '暖通空调产品' },
  { company: '北京京能燕开综合能源服务有限公司', name: '张杰', phone: '13910424155', content: '智慧能源管理平台合作意向', type: '智慧能源', submitTime: '2025-11-13 01:49:47', ip: '123.113.177.89', page: '智慧能源管理' },
  { company: '江西龙轩工程有限公司', name: '卫强', phone: '13576953894', content: '项目案例咨询', type: '项目合作', submitTime: '2025-09-24 00:14:00', ip: '202.160.156.192', page: '项目案例' },
  { company: '汇佳科技', name: '成女士', phone: '13205469688', content: '希望获取技术资料', type: '技术咨询', submitTime: '2025-07-23 02:27:30', ip: '112.224.163.44', page: '首页' },
  { company: '国际绿色经济协会', name: '李路副秘书长', phone: '18210197159', content: '战略合作洽谈', type: '战略合作', submitTime: '2025-07-12 05:06:19', ip: '124.64.23.180', page: '关于我们' },
  { company: '凯丹置地', name: '李睿', phone: '13502157247', content: '楼宇节能改造咨询', type: '节能改造', submitTime: '2025-05-06 19:35:13', ip: '36.112.104.194', page: '综合能源节能' },
]

/** 原中文分类 → 反馈类型枚举 */
const TYPE_MAP: Record<string, FeedbackType> = {
  综合能源: 'cooperation',
  合同能源: 'cooperation',
  智慧能源: 'cooperation',
  项目合作: 'cooperation',
  战略合作: 'cooperation',
  节能改造: 'cooperation',
  暖通产品: 'suggestion',
  技术咨询: 'other',
}

async function main(): Promise<void> {
  const { AppModule } = await import('../app.module')
  const { Feedback } = await import('../modules/feedback/feedback.entity')
  const { FEEDBACK_SOURCE, FEEDBACK_STATUS } = await import('../common/enums')

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  const repo = app.get(DataSource).getRepository(Feedback)

  let inserted = 0
  let skipped = 0

  for (const m of LEGACY_MESSAGES) {
    const createdAt = new Date(m.submitTime.replace(/-/g, '/'))
    // 幂等判重：同姓名同提交时间视为同一条
    const exists = await repo.findOne({ where: { name: m.name, createdAt } })
    if (exists) {
      skipped += 1
      continue
    }

    await repo.save(
      repo.create({
        source: FEEDBACK_SOURCE.ANONYMOUS,
        memberId: null,
        company: m.company,
        name: m.name,
        phone: m.phone,
        feedbackType: TYPE_MAP[m.type] ?? 'other',
        content: m.content,
        status: FEEDBACK_STATUS.PENDING,
        submitIp: m.ip,
        sourcePage: m.page,
        createdAt,
      }),
    )
    inserted += 1
  }

  const total = await repo.count()
  await app.close()

  console.info(`种子数据写入完成：新增 ${inserted} 条，跳过 ${skipped} 条，当前反馈总数 ${total}`)
}

main().catch((err) => {
  console.error('种子数据写入失败：', err)
  process.exit(1)
})
