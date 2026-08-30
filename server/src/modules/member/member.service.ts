// 会员业务服务 —— 个人资料读写 + 后台会员管理
// 查询一律排除 passwordHash：用 select 白名单保证运行时真的不返回敏感字段
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { compare, hash } from 'bcryptjs'
import { Member } from './member.entity'
import { MEMBER_STATUS, type MemberStatus } from '../../common/enums'
import { toMemberDetailVo, toMemberListItemVo, toMemberProfileVo } from './vo/member.vo'
import type { MemberDetailVo, MemberListItemVo, MemberProfileVo } from './vo/member.vo'
import type { ChangePasswordDto, MemberQueryDto, UpdateProfileDto } from './dto/member-manage.dto'
import type { Result } from './member-auth.service'

/** bcrypt 代价因子，与认证服务保持一致 */
const BCRYPT_ROUNDS = 10

/** 列表与详情查询的字段白名单，排除 passwordHash */
const SAFE_FIELDS = [
  'id',
  'phone',
  'nickname',
  'email',
  'avatar',
  'status',
  'registerIp',
  'lastLoginAt',
  'createdAt',
] as const

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private readonly repo: Repository<Member>,
  ) {}

  /** 读取会员自身资料 */
  async getProfile(memberId: number): Promise<Result<MemberProfileVo>> {
    const member = await this.repo.findOne({
      where: { id: memberId, deletedAt: IsNull() },
      select: [...SAFE_FIELDS],
    })
    if (!member) return { ok: false, message: '会员不存在' }
    return { ok: true, data: toMemberProfileVo(member) }
  }

  /** 修改会员自身资料 */
  async updateProfile(memberId: number, dto: UpdateProfileDto): Promise<Result<MemberProfileVo>> {
    const member = await this.repo.findOne({ where: { id: memberId, deletedAt: IsNull() } })
    if (!member) return { ok: false, message: '会员不存在' }

    if (dto.nickname !== undefined) member.nickname = dto.nickname
    if (dto.email !== undefined) member.email = dto.email || null
    if (dto.avatar !== undefined) member.avatar = dto.avatar || null

    const saved = await this.repo.save(member)
    return { ok: true, data: toMemberProfileVo(saved) }
  }

  /** 会员修改自身密码，需校验原密码 */
  async changePassword(memberId: number, dto: ChangePasswordDto): Promise<Result<null>> {
    const member = await this.repo.findOne({ where: { id: memberId, deletedAt: IsNull() } })
    if (!member) return { ok: false, message: '会员不存在' }

    const matched = await compare(dto.oldPassword, member.passwordHash)
    if (!matched) return { ok: false, message: '原密码错误' }

    member.passwordHash = await hash(dto.newPassword, BCRYPT_ROUNDS)
    await this.repo.save(member)
    return { ok: true, data: null }
  }

  /** 后台分页查询会员 */
  async list(query: MemberQueryDto): Promise<{
    list: MemberListItemVo[]
    total: number
    page: number
    pageSize: number
  }> {
    const page = Math.max(query.page ?? 1, 1)
    const pageSize = Math.min(Math.max(query.pageSize ?? 10, 1), 100)

    const qb = this.repo
      .createQueryBuilder('m')
      .select(SAFE_FIELDS.map((f) => `m.${f}`))
      .where('m.deletedAt IS NULL')

    if (query.keyword) {
      // 关键字覆盖昵称、手机号、邮箱
      qb.andWhere('(m.nickname LIKE :kw OR m.phone LIKE :kw OR m.email LIKE :kw)', {
        kw: `%${query.keyword}%`,
      })
    }
    if (query.status) qb.andWhere('m.status = :status', { status: query.status })
    // 起止日期各自独立生效（只传一端也要过滤）；且必须传 Date 对象——
    // createdAt 以 UTC 存储，拼本地日期字符串比较会漏掉本地凌晨 0-8 点的记录
    if (query.startDate) {
      qb.andWhere('m.createdAt >= :start', { start: new Date(`${query.startDate}T00:00:00`) })
    }
    if (query.endDate) {
      qb.andWhere('m.createdAt <= :end', { end: new Date(`${query.endDate}T23:59:59.999`) })
    }

    const [rows, total] = await qb
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    return { list: rows.map(toMemberListItemVo), total, page, pageSize }
  }

  /** 后台查询会员详情 */
  async detail(id: number): Promise<Result<MemberDetailVo>> {
    const member = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
      select: [...SAFE_FIELDS],
    })
    if (!member) return { ok: false, message: '会员不存在' }
    return { ok: true, data: toMemberDetailVo(member) }
  }

  /** 后台变更会员状态（启用/禁用） */
  async updateStatus(id: number, status: MemberStatus): Promise<Result<null>> {
    const member = await this.repo.findOne({ where: { id, deletedAt: IsNull() } })
    if (!member) return { ok: false, message: '会员不存在' }

    member.status = status
    // 启用时同步解除锁定，避免管理员启用后会员仍登录不上
    if (status === MEMBER_STATUS.NORMAL) {
      member.lockedUntil = null
      member.failedAttempts = 0
    }
    await this.repo.save(member)
    return { ok: true, data: null }
  }

  /** 后台重置会员密码 */
  async resetPassword(id: number, newPassword: string): Promise<Result<null>> {
    const member = await this.repo.findOne({ where: { id, deletedAt: IsNull() } })
    if (!member) return { ok: false, message: '会员不存在' }

    member.passwordHash = await hash(newPassword, BCRYPT_ROUNDS)
    member.failedAttempts = 0
    member.lockedUntil = null
    await this.repo.save(member)
    return { ok: true, data: null }
  }

  /** 后台删除会员（软删除，保留反馈与日志的可追溯性） */
  async remove(id: number): Promise<Result<null>> {
    const member = await this.repo.findOne({ where: { id, deletedAt: IsNull() } })
    if (!member) return { ok: false, message: '会员不存在' }

    member.deletedAt = new Date()
    await this.repo.save(member)
    return { ok: true, data: null }
  }
}
