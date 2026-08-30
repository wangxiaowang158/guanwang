// 登录日志服务 —— 写入审计记录、后台查询、按日期清理
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, LessThan, Like, Repository } from 'typeorm'
import { MemberLoginLog } from './login-log.entity'
import { Member } from '../member/member.entity'
import type { LoginFailReason, LoginMethod, LoginResult } from '../../common/enums'
import { LOGIN_RESULT } from '../../common/enums'

/** 写入日志的入参 */
export interface WriteLogInput {
  memberId: number | null
  loginAccount: string
  loginMethod: LoginMethod
  loginIp: string | null
  deviceInfo: string | null
  result: LoginResult
  failReason?: LoginFailReason | null
}

/** 后台查询条件 */
export interface LogQuery {
  keyword?: string
  result?: LoginResult
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

@Injectable()
export class LoginLogService {
  constructor(
    @InjectRepository(MemberLoginLog)
    private readonly repo: Repository<MemberLoginLog>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
  ) {}

  /** 写入一条登录日志；失败不阻断登录主流程，由调用方决定是否 await */
  async write(input: WriteLogInput): Promise<void> {
    await this.repo.save(
      this.repo.create({
        memberId: input.memberId,
        loginAccount: input.loginAccount,
        loginMethod: input.loginMethod,
        loginIp: input.loginIp,
        // User-Agent 可能很长，截断保存避免超出列宽
        deviceInfo: input.deviceInfo ? input.deviceInfo.slice(0, 300) : null,
        result: input.result,
        failReason: input.result === LOGIN_RESULT.FAILURE ? (input.failReason ?? null) : null,
      }),
    )
  }

  /** 后台分页查询，附带会员昵称 */
  async list(query: LogQuery) {
    const page = Math.max(query.page ?? 1, 1)
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 100)

    // 关键字命中会员昵称时先解析出会员 id，再按 id 或账号匹配
    let memberIds: number[] = []
    if (query.keyword) {
      const members = await this.memberRepo.find({
        where: { nickname: Like(`%${query.keyword}%`) },
        select: ['id'],
      })
      memberIds = members.map((m) => m.id)
    }

    const qb = this.repo.createQueryBuilder('log')
    if (query.keyword) {
      qb.andWhere(
        memberIds.length > 0
          ? '(log.loginAccount LIKE :kw OR log.memberId IN (:...ids))'
          : 'log.loginAccount LIKE :kw',
        memberIds.length > 0 ? { kw: `%${query.keyword}%`, ids: memberIds } : { kw: `%${query.keyword}%` },
      )
    }
    if (query.result) qb.andWhere('log.result = :result', { result: query.result })
    // 起止日期各自独立生效（只传一端也要过滤）；且必须传 Date 对象——
    // createdAt 以 UTC 存储，拼本地日期字符串比较会漏掉本地凌晨 0-8 点的记录
    if (query.startDate) {
      qb.andWhere('log.createdAt >= :start', { start: new Date(`${query.startDate}T00:00:00`) })
    }
    if (query.endDate) {
      qb.andWhere('log.createdAt <= :end', { end: new Date(`${query.endDate}T23:59:59.999`) })
    }

    const [rows, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    // 批量补昵称，避免逐行查询
    const ids = [...new Set(rows.map((r) => r.memberId).filter((v): v is number => v !== null))]
    const nameMap = new Map<number, string>()
    if (ids.length > 0) {
      const members = await this.memberRepo.find({ where: { id: In(ids) }, select: ['id', 'nickname'] })
      members.forEach((m) => nameMap.set(m.id, m.nickname))
    }

    return {
      list: rows.map((r) => ({
        id: r.id,
        memberId: r.memberId,
        nickname: r.memberId ? (nameMap.get(r.memberId) ?? '已删除会员') : null,
        loginAccount: r.loginAccount,
        loginMethod: r.loginMethod,
        loginIp: r.loginIp,
        deviceInfo: r.deviceInfo,
        result: r.result,
        failReason: r.failReason,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    }
  }

  /** 查询某会员最近的登录记录，供会员详情页展示 */
  async recentByMember(memberId: number, limit = 5): Promise<MemberLoginLog[]> {
    return this.repo.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  /** 清理指定日期之前的日志，返回删除条数 */
  async clearBefore(beforeDate: string): Promise<number> {
    const result = await this.repo.delete({ createdAt: LessThan(new Date(`${beforeDate} 00:00:00`)) })
    return result.affected ?? 0
  }
}
