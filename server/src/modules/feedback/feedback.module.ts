// 反馈模块 —— 匿名咨询与会员反馈合并为一张表，前台提交 + 后台处理
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Feedback } from './feedback.entity'
import { FeedbackReply } from './feedback-reply.entity'
import { Member } from '../member/member.entity'
import { FeedbackService } from './feedback.service'
import { PortalFeedbackController } from './portal-feedback.controller'
import { MgmtFeedbackController } from './mgmt-feedback.controller'
import { MemberModule } from '../member/member.module'

@Module({
  // 引入 Member 仓储用于取昵称快照与手机号缺省值；MemberModule 提供 MemberGuard
  imports: [TypeOrmModule.forFeature([Feedback, FeedbackReply, Member]), MemberModule],
  controllers: [PortalFeedbackController, MgmtFeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
