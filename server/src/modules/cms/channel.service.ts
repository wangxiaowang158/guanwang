// 栏目服务 —— 树结构的增删改查
// key 与 type 创建后不可改：内容记录按 key 关联，管理端按 type 决定渲染哪种界面
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CHANNEL_TYPE } from '../../common/enums'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import type { CreateChannelDto, UpdateChannelDto } from './dto/channel.dto'

/** 可写的纯文本字段，统一按「空串即清空」处理；layout 有自己的取值域，单独赋值 */
const TEXT_FIELDS = [
  'icon', 'seoTitle', 'seoKeywords', 'seoDescription',
  'portalPath', 'anchor', 'subheading',
  'heroEyebrow', 'heroTitle', 'heroDesc',
] as const

/** 文本字段补丁，两个 DTO 均在结构上满足 */
type TextPatch = Partial<Record<(typeof TEXT_FIELDS)[number] | 'layout', string>>

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel) private readonly repo: Repository<Channel>,
    @InjectRepository(Content) private readonly contentRepo: Repository<Content>,
  ) {}

  /** 全部栏目，扁平数组，按层级与 sort 排序后返回，前端自行组树 */
  async list(): Promise<Channel[]> {
    return this.repo.find({ order: { parentId: 'ASC', sort: 'ASC', id: 'ASC' } })
  }

  /** 按 key 取栏目 */
  async findByKey(key: string): Promise<Channel | null> {
    return this.repo.findOne({ where: { key } })
  }

  /** 按 key 或 id 取栏目，两者都没传视为参数错误 */
  async detail(params: { key?: string; id?: number }): Promise<Channel> {
    const { key, id } = params
    if (!key && id === undefined) {
      throw new BadRequestException('请提供栏目标识或栏目 id')
    }
    const found = key
      ? await this.repo.findOne({ where: { key } })
      : await this.repo.findOne({ where: { id } })
    if (!found) throw new NotFoundException('栏目不存在')
    return found
  }

  /** 新增栏目 */
  async create(dto: CreateChannelDto): Promise<Channel> {
    const exists = await this.repo.findOne({ where: { key: dto.key } })
    if (exists) throw new BadRequestException('栏目标识已存在，请换一个')

    if (dto.parentId !== undefined && dto.parentId !== null) {
      const parent = await this.repo.findOne({ where: { id: dto.parentId } })
      if (!parent) throw new BadRequestException('父栏目不存在')
    }

    const entity = this.repo.create({
      key: dto.key,
      name: dto.name,
      type: dto.type as Channel['type'],
      parentId: dto.parentId ?? null,
      sort: dto.sort ?? 0,
      formFields: JSON.stringify(dto.formFields ?? []),
      listColumns: JSON.stringify(dto.listColumns ?? []),
    })
    this.applyTextFields(entity, dto)
    return this.repo.save(entity)
  }

  /** 更新栏目，只覆盖传过来的字段 */
  async update(dto: UpdateChannelDto): Promise<void> {
    const entity = await this.repo.findOne({ where: { id: dto.id } })
    if (!entity) throw new NotFoundException('栏目不存在')

    if (dto.name !== undefined) entity.name = dto.name
    if (dto.sort !== undefined) entity.sort = dto.sort
    if (dto.formFields !== undefined) entity.formFields = JSON.stringify(dto.formFields)
    if (dto.listColumns !== undefined) entity.listColumns = JSON.stringify(dto.listColumns)
    this.applyTextFields(entity, dto)

    await this.repo.save(entity)
  }

  /**
   * 删除栏目：连同所有后代节点及其内容一并删除
   * 会员中心等功能型栏目由固定路由承载，删除后管理端将失去入口，故一律拒绝
   */
  async remove(id: number): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) throw new NotFoundException('栏目不存在')

    const functional: string[] = [
      CHANNEL_TYPE.SITECONFIG, CHANNEL_TYPE.ADMINS, CHANNEL_TYPE.MEMBERS,
      CHANNEL_TYPE.FEEDBACK, CHANNEL_TYPE.AUTHCONFIG, CHANNEL_TYPE.LOGINLOG,
    ]
    if (functional.includes(entity.type)) {
      throw new BadRequestException('系统功能栏目不允许删除')
    }

    const all = await this.repo.find()
    const doomed = this.collectDescendants(all, id)
    const keys = doomed.map(c => c.key)

    await this.contentRepo.delete({ channelKey: In(keys) })
    await this.repo.delete({ id: In(doomed.map(c => c.id)) })
  }

  /**
   * 解析某栏目所属的顶级栏目名
   * 权限项取值为一级菜单名，而内容接口只拿到子栏目 key，需先上溯到顶级节点
   * @param key 栏目标识，可能是任意层级
   * @returns 顶级栏目名；栏目不存在时返回 null
   */
  async resolveRootName(key: string): Promise<string | null> {
    if (!key) return null
    const all = await this.repo.find()
    let cur = all.find(c => c.key === key)
    if (!cur) return null
    // 防御环形 parentId 造成死循环：最多上溯节点总数次
    for (let i = 0; i < all.length && cur.parentId !== null; i += 1) {
      const parent = all.find(c => c.id === cur!.parentId)
      if (!parent) break
      cur = parent
    }
    return cur.name
  }

  /** 自身 + 全部后代节点 */
  private collectDescendants(all: Channel[], rootId: number): Channel[] {
    const result: Channel[] = []
    const walk = (parentId: number) => {
      for (const c of all) {
        if (c.parentId === parentId) {
          result.push(c)
          walk(c.id)
        }
      }
    }
    const root = all.find(c => c.id === rootId)
    if (root) result.push(root)
    walk(rootId)
    return result
  }

  /** 文本类字段统一赋值：传空串即清空（存 null），未传则保持原值 */
  private applyTextFields(entity: Channel, dto: TextPatch): void {
    for (const field of TEXT_FIELDS) {
      const v = dto[field]
      if (v === undefined) continue
      entity[field] = v.trim() ? v.trim() : null
    }
    if (dto.layout !== undefined) {
      // 取值已由 DTO 的 @IsIn 校验，此处只处理「空串即清空」
      entity.layout = dto.layout ? (dto.layout as NonNullable<Channel['layout']>) : null
    }
  }
}
