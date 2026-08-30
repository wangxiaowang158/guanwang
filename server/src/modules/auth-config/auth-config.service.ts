// 注册登录配置服务 —— 单例读写，首次访问时自动写入默认值
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AUTH_CONFIG_DEFAULTS, AUTH_CONFIG_ID, AuthConfig } from './auth-config.entity'
import type { UpdateAuthConfigDto } from './dto/auth-config.dto'

@Injectable()
export class AuthConfigService {
  constructor(
    @InjectRepository(AuthConfig)
    private readonly repo: Repository<AuthConfig>,
  ) {}

  /** 读取配置；不存在则写入默认值后返回 */
  async get(): Promise<AuthConfig> {
    const existing = await this.repo.findOne({ where: { id: AUTH_CONFIG_ID } })
    if (existing) return existing
    return this.repo.save(this.repo.create(AUTH_CONFIG_DEFAULTS))
  }

  /** 更新配置，保存后即时生效 */
  async update(dto: UpdateAuthConfigDto): Promise<AuthConfig> {
    const current = await this.get()
    Object.assign(current, dto)
    return this.repo.save(current)
  }

  /**
   * 按配置校验密码强度
   * @returns 不合规时返回中文提示，合规返回 null
   */
  async validatePassword(password: string): Promise<string | null> {
    const cfg = await this.get()
    if (password.length < cfg.passwordMinLength) {
      return `密码长度不得少于 ${cfg.passwordMinLength} 位`
    }
    if (cfg.passwordRequireMixed && !(/[A-Za-z]/.test(password) && /\d/.test(password))) {
      return '密码需同时包含字母与数字'
    }
    return null
  }
}
