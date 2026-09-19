// 管理员服务 —— 账号维护、密码校验、首个账号自举
// 安全要点：bcrypt 哈希、登录失败提示统一（防账号枚举）、超管不可删除或降权
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Like, Repository } from 'typeorm'
import { compare, hash } from 'bcryptjs'
import { ADMIN_SEED } from '../../config/app.config'
import { Admin } from './admin.entity'
import type {
  CreateAdminDto,
  UpdateAdminDto,
} from './dto/admin.dto'

/** bcrypt 代价因子，与会员侧保持一致 */
const BCRYPT_ROUNDS = 10

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name)

  constructor(
    @InjectRepository(Admin)
    private readonly repo: Repository<Admin>,
  ) {}

  /**
   * 确保存在首个超级管理员
   * 仅在表为空时创建，已有账号则不做任何事（幂等，可安全重复调用）
   */
  async ensureSeedAdmin(): Promise<void> {
    const count = await this.repo.count()
    if (count > 0) return

    await this.repo.save(
      this.repo.create({
        account: ADMIN_SEED.account,
        name: '超级管理员',
        passwordHash: await hash(ADMIN_SEED.password, BCRYPT_ROUNDS),
        perms: '[]',
        isSuper: true,
        wechatBound: false,
      }),
    )
    this.logger.warn(
      `已创建初始管理员账号「${ADMIN_SEED.account}」，请登录后立即修改密码（可用 ADMIN_SEED_PASSWORD 指定初始密码）`,
    )
  }

  /** 按账号查找，登录用 */
  findByAccount(account: string): Promise<Admin | null> {
    return this.repo.findOne({ where: { account } })
  }

  /** 按 id 查找；不存在抛 404 */
  async findById(id: number): Promise<Admin> {
    const found = await this.repo.findOne({ where: { id } })
    if (!found) throw new NotFoundException('管理员不存在')
    return found
  }

  /** 后台列表，支持账号或名称模糊匹配 */
  async list(keyword?: string): Promise<Admin[]> {
    const where = keyword
      ? [{ account: Like(`%${keyword}%`) }, { name: Like(`%${keyword}%`) }]
      : undefined
    return this.repo.find({ where, order: { createdAt: 'DESC' } })
  }

  /** 新增管理员；账号重复时报错 */
  async create(dto: CreateAdminDto): Promise<Admin> {
    const exists = await this.repo.findOne({ where: { account: dto.account } })
    if (exists) throw new BadRequestException('该账号已存在')

    return this.repo.save(
      this.repo.create({
        account: dto.account,
        name: dto.name,
        passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
        perms: JSON.stringify(dto.perms ?? []),
        isSuper: false,
        wechatBound: dto.wechatBound ?? false,
      }),
    )
  }

  /** 更新管理员资料与权限；超管的权限清单不参与保存（其权限由 isSuper 表达） */
  async update(id: number, dto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.findById(id)
    if (dto.name !== undefined) admin.name = dto.name
    if (dto.wechatBound !== undefined) admin.wechatBound = dto.wechatBound
    if (dto.perms !== undefined && !admin.isSuper) {
      admin.perms = JSON.stringify(dto.perms)
    }
    return this.repo.save(admin)
  }

  /** 重置指定管理员密码 */
  async resetPassword(id: number, password: string): Promise<void> {
    const admin = await this.findById(id)
    admin.passwordHash = await hash(password, BCRYPT_ROUNDS)
    await this.repo.save(admin)
  }

  /**
   * 修改自己的密码
   * @returns 原密码错误时返回提示，成功返回 null
   */
  async changeOwnPassword(id: number, oldPassword: string, newPassword: string): Promise<string | null> {
    const admin = await this.findById(id)
    const matched = await compare(oldPassword, admin.passwordHash)
    if (!matched) return '原密码错误'
    admin.passwordHash = await hash(newPassword, BCRYPT_ROUNDS)
    await this.repo.save(admin)
    return null
  }

  /** 删除管理员；超管不可删除，避免把自己锁在系统外 */
  async remove(id: number): Promise<void> {
    const admin = await this.findById(id)
    if (admin.isSuper) throw new BadRequestException('超级管理员不可删除')
    await this.repo.remove(admin)
  }

  /** 校验账号密码；返回 null 表示凭证无效（不区分账号不存在与密码错误） */
  async verifyCredentials(account: string, password: string): Promise<Admin | null> {
    const admin = await this.findByAccount(account)
    if (!admin) return null
    const matched = await compare(password, admin.passwordHash)
    return matched ? admin : null
  }
}
