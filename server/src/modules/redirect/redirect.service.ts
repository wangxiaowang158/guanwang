// 跳转规则服务 —— 后台维护规则，网关对每个页面请求先问一次「这个地址要不要跳」
//
// 网关每次页面请求都会来查，故规则整表缓存在内存里（规则量十~百级），写操作后整表重载。
// 命中计数异步落库、失败不影响跳转本身
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { resolvePaging, type PageResult } from '../../common/pagination'
import { RedirectRule } from './redirect.entity'
import type { SaveRedirectDto } from './dto/redirect.dto'

/** 不允许作为旧地址的前缀：接口、上传、构建产物与网关内部路径，跳走它们会让整站瘫掉 */
const RESERVED_PREFIXES = ['/api', '/uploads', '/assets', '/__prerender']

/**
 * 规整路径：去查询串与锚点、URL 解码、转小写、合并连续斜杠、去尾斜杠
 * 两侧（入库与查询）用同一个函数，写法差异（/About/、/about?x=1）都能命中同一条规则
 * @returns 规整后的路径；不是合法站内路径时返回空串
 */
export function normalizeRedirectPath(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let p = raw.trim().split(/[?#]/)[0]
  try {
    p = decodeURI(p)
  } catch {
    return ''
  }
  if (!p.startsWith('/') || p.includes('\0') || p.length > 300) return ''
  p = p.toLowerCase().replace(/\/{2,}/g, '/')
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p
}

/** 跳转目标：站内 / 开头（不允许 //），或 http(s) 绝对地址；禁空白与引号尖括号 */
function isValidTarget(url: string): boolean {
  if (/[\s"'<>\\]/.test(url)) return false
  if (/^\/(?!\/)/.test(url)) return true
  return /^https?:\/\/[^/]+/i.test(url)
}

@Injectable()
export class RedirectService {
  private readonly logger = new Logger(RedirectService.name)
  /** 已启用规则：规整后的旧地址 → 规则 */
  private cache: Map<string, RedirectRule> | null = null

  constructor(@InjectRepository(RedirectRule) private readonly repo: Repository<RedirectRule>) {}

  /**
   * 查找某路径的跳转
   * @param rawPath 原始请求路径（可带查询串）
   * @returns 命中时给目标与状态码；目标是站内路径时把原查询串带过去（活动参数、渠道参数不丢）
   */
  async resolve(rawPath: string): Promise<{ location: string; statusCode: number } | null> {
    const path = normalizeRedirectPath(rawPath)
    if (!path) return null
    const rule = (await this.rules()).get(path)
    if (!rule) return null
    void this.repo
      .createQueryBuilder()
      .update(RedirectRule)
      .set({ hits: () => 'hits + 1', lastHitAt: new Date() })
      .where('id = :id', { id: rule.id })
      .execute()
      .catch((err: unknown) => this.logger.warn(`跳转命中计数失败：${err instanceof Error ? err.message : String(err)}`))
    const query = rawPath.includes('?') ? rawPath.slice(rawPath.indexOf('?')).split('#')[0] : ''
    const location = rule.toUrl.startsWith('/') && query && !rule.toUrl.includes('?') ? `${rule.toUrl}${query}` : rule.toUrl
    return { location, statusCode: rule.statusCode }
  }

  /** 后台列表 */
  async list(params: { page?: number; pageSize?: number; keyword?: string }): Promise<PageResult<RedirectRule>> {
    const { page, pageSize, skip } = resolvePaging(params.page, params.pageSize, { defaultSize: 20, maxSize: 100 })
    const qb = this.repo.createQueryBuilder('r')
    const kw = params.keyword?.trim()
    if (kw) qb.where('(r.fromPath LIKE :kw OR r.toUrl LIKE :kw OR r.remark LIKE :kw)', { kw: `%${kw}%` })
    const [list, total] = await qb.orderBy('r.id', 'DESC').skip(skip).take(pageSize).getManyAndCount()
    return { list, total, page, pageSize }
  }

  /** 新增或修改 */
  async save(dto: SaveRedirectDto): Promise<RedirectRule> {
    const fromPath = normalizeRedirectPath(dto.fromPath)
    if (!fromPath || fromPath === '/') throw new BadRequestException('旧地址须为 / 开头的站内路径，且不能是首页')
    if (RESERVED_PREFIXES.some(p => fromPath === p || fromPath.startsWith(`${p}/`))) {
      throw new BadRequestException('接口、上传文件与静态资源地址不能设置跳转')
    }
    const toUrl = dto.toUrl.trim()
    if (!isValidTarget(toUrl)) throw new BadRequestException('新地址须为 / 开头的站内路径，或 http(s):// 开头的完整网址')
    // 自己跳自己、或跳到另一条规则的旧地址（形成链条甚至环），浏览器会多跳一轮或直接报「重定向次数过多」
    const target = normalizeRedirectPath(toUrl)
    if (target === fromPath) throw new BadRequestException('新地址不能与旧地址相同')
    if (target) {
      const chained = await this.repo.findOne({ where: { fromPath: target } })
      if (chained && chained.id !== dto.id) {
        throw new BadRequestException(`新地址本身已设置了跳转（→ ${chained.toUrl}），请直接填最终地址`)
      }
    }
    const dup = await this.repo.findOne({ where: { fromPath } })
    if (dup && dup.id !== dto.id) throw new BadRequestException('该旧地址已有跳转规则')

    const entity = dto.id ? await this.repo.findOne({ where: { id: dto.id } }) : this.repo.create()
    if (!entity) throw new NotFoundException('跳转规则不存在')
    entity.fromPath = fromPath
    entity.toUrl = toUrl
    entity.statusCode = dto.statusCode ?? 301
    entity.enabled = dto.enabled ?? true
    entity.remark = (dto.remark ?? '').trim().slice(0, 100)
    const saved = await this.repo.save(entity)
    this.cache = null
    return saved
  }

  /** 批量删除 */
  async remove(ids: number[]): Promise<number> {
    if (!ids.length) throw new BadRequestException('请选择要删除的规则')
    const res = await this.repo.delete(ids)
    this.cache = null
    return res.affected ?? 0
  }

  /** 已启用规则表，懒加载并常驻 */
  private async rules(): Promise<Map<string, RedirectRule>> {
    if (this.cache) return this.cache
    const rows = await this.repo.find({ where: { enabled: true } })
    this.cache = new Map(rows.map(r => [r.fromPath, r]))
    return this.cache
  }
}
