// 栏目服务 —— 树结构的增删改查
// key 与 type 创建后不可改：内容记录按 key 关联，管理端按 type 决定渲染哪种界面
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CHANNEL_TYPE } from '../../common/enums'
import { Channel } from './channel.entity'
import { Content } from './content.entity'
import { ContentRevision } from './content-revision.entity'
import type { CreateChannelDto, SortChannelsDto, UpdateChannelDto } from './dto/channel.dto'
import { applyPageFields, HOME_PATH } from './channel-page-rules'
import { assetUrl } from '../../common/site-layout'

/** 被前台代码按 key 直接引用的页面（首页板块、新闻列表），删除后前台对应功能失效 */
const PINNED_PAGE_KEYS = new Set(['home', 'news'])

/** 可写的纯文本字段，统一按「空串即清空」处理；layout 有自己的取值域，单独赋值 */
const TEXT_FIELDS = [
  'icon', 'seoTitle', 'seoKeywords', 'seoDescription',
  // portalPath / menuParent / externalUrl / heroBg / heroVideo 不在此列：
  // 它们有保留字、唯一性与层级约束，由 channel-page-rules 单独校验后赋值
  'anchor', 'subheading', 'menuGroup', 'menuDesc',
  'heroEyebrow', 'heroTitle', 'heroDesc',
] as const

/** 文本字段补丁，两个 DTO 均在结构上满足 */
type TextPatch = Partial<Record<(typeof TEXT_FIELDS)[number] | 'layout', string>>

/** 区块外观补丁，两个 DTO 均在结构上满足 */
interface AppearancePatch {
  blockTone?: string
  blockBg?: string
  blockColumns?: number
  headingAlign?: string
}

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

  /**
   * 某栏目所在的对外页面（上溯到顶级）：草稿预览、后台「查看页面」用
   * @returns 页面 key 与前台路径；该栏目不在任何对外页面下（Banner 等）时为 null。
   *   首页同样返回 null：首页板块走聚合接口，不读预览令牌，开出去看不到草稿反而误导
   */
  async portalPageOf(key: string): Promise<{ key: string; path: string; anchor?: string } | null> {
    const all = await this.repo.find()
    let cur = all.find(c => c.key === key)
    const start = cur
    for (let i = 0; i < all.length && cur && cur.parentId !== null; i += 1) {
      cur = all.find(c => c.id === cur!.parentId)
    }
    if (!cur || cur.parentId !== null || !cur.portalPath || cur.portalPath === HOME_PATH || cur.hidden) return null
    const result: { key: string; path: string; anchor?: string } = { key: cur.key, path: cur.portalPath }
    // 从区块栏目进来时带上锚点，预览打开直接落到该区块
    if (start && start !== cur && start.anchor) result.anchor = start.anchor
    return result
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
    this.applyAppearance(entity, dto)
    applyPageFields(entity, dto, await this.repo.find())
    return this.repo.save(entity)
  }

  /** 更新栏目，只覆盖传过来的字段 */
  async update(dto: UpdateChannelDto): Promise<void> {
    const entity = await this.repo.findOne({ where: { id: dto.id } })
    if (!entity) throw new NotFoundException('栏目不存在')

    if (dto.name !== undefined) entity.name = dto.name
    if (dto.hidden !== undefined) {
      if (dto.hidden) this.assertHideable(entity)
      entity.hidden = dto.hidden
    }
    if (dto.sort !== undefined) entity.sort = dto.sort
    if (dto.formFields !== undefined) entity.formFields = JSON.stringify(dto.formFields)
    if (dto.listColumns !== undefined) entity.listColumns = JSON.stringify(dto.listColumns)
    this.applyTextFields(entity, dto)
    this.applyAppearance(entity, dto)
    applyPageFields(entity, dto, await this.repo.find())

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
      // 操作日志是审计入口，且新增栏目的类型选项里没有它，删了就建不回来
      CHANNEL_TYPE.OPLOG,
    ]
    if (functional.includes(entity.type)) {
      throw new BadRequestException('系统功能栏目不允许删除')
    }
    // 首页、新闻被前台代码按 key 直接引用，删了对应功能就失效；其余页面由后台自由增删
    if (PINNED_PAGE_KEYS.has(entity.key) || entity.portalPath === HOME_PATH) {
      throw new BadRequestException('首页与新闻资讯页面不允许删除，可隐藏或调整其下的子栏目')
    }
    const all = await this.repo.find()
    // 有页面挂靠在它下面时拒绝：删掉后那些页面会在导航里失去归属，变成意外的一级菜单
    if (all.some(c => c.menuParent === entity.key)) {
      throw new BadRequestException('有页面挂靠在该栏目下，请先删除这些页面或调整其菜单挂靠')
    }
    // 后代里含系统栏目时同样拒绝，否则删父级会把它们连带删掉
    const doomed = this.collectDescendants(all, id)
    if (doomed.some(c => functional.includes(c.type) || (c.id !== id && c.portalPath))) {
      throw new BadRequestException('该栏目下含系统功能栏目或官网页面，不允许删除')
    }

    const keys = doomed.map(c => c.key)

    // 栏目整个删掉时内容随之物理删除（含回收站里的），历史版本同理，没有栏目也就无处恢复
    await this.contentRepo.delete({ channelKey: In(keys) })
    await this.contentRepo.manager.delete(ContentRevision, { channelKey: In(keys) })
    await this.repo.delete({ id: In(doomed.map(c => c.id)) })
  }

  /**
   * 能授权访问某栏目的权限项：所属顶级栏目名，以及该顶级栏目挂靠目标的名称
   * 权限项取值为一级菜单名，而内容接口只拿到子栏目 key，需先上溯到顶级节点。
   * 挂靠页随所挂栏目授权：授予「智慧能源解决方案」即可管理其下全部子智能体页；
   * 同时保留按页面自身名授权，存量账号已勾选的旧权限项不失效。
   * 只跟一跳——导航只有两层，挂靠目标自身不会再挂靠（channel-page-rules 保证）
   * @param key 栏目标识，可能是任意层级
   * @returns 权限项名称列表；栏目不存在时为空数组
   */
  async resolvePermNames(key: string): Promise<string[]> {
    if (!key) return []
    const all = await this.repo.find()
    let cur = all.find(c => c.key === key)
    if (!cur) return []
    // 防御环形 parentId 造成死循环：最多上溯节点总数次
    for (let i = 0; i < all.length && cur.parentId !== null; i += 1) {
      const parent = all.find(c => c.id === cur!.parentId)
      if (!parent) break
      cur = parent
    }
    const root = cur
    const dockTarget = root.menuParent
      ? all.find(c => c.key === root.menuParent && c.parentId === null)
      : undefined
    return dockTarget ? [root.name, dockTarget.name] : [root.name]
  }

  /**
   * 隐藏对一级与二级栏目都可用，但有两条底线：
   * 系统功能栏目隐藏后管理端失去入口；首页是前台根路径，隐藏会让站点没有首页
   */
  private assertHideable(entity: Channel): void {
    const functional: string[] = [
      CHANNEL_TYPE.SITECONFIG, CHANNEL_TYPE.ADMINS, CHANNEL_TYPE.MEMBERS,
      CHANNEL_TYPE.FEEDBACK, CHANNEL_TYPE.AUTHCONFIG, CHANNEL_TYPE.LOGINLOG, CHANNEL_TYPE.OPLOG,
    ]
    if (functional.includes(entity.type)) throw new BadRequestException('系统功能栏目不允许隐藏')
    if (entity.portalPath === '/') throw new BadRequestException('首页不允许隐藏')
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

  /**
   * 批量改排序与显隐（导航排序界面）：一次事务内写完，避免中途失败留下半新半旧的顺序
   * 隐藏沿用单条更新的底线校验（系统栏目、首页不可隐藏）
   */
  async sortBatch(dto: SortChannelsDto): Promise<void> {
    const ids = [...new Set(dto.items.map(i => i.id))]
    if (!ids.length) return
    const rows = await this.repo.find({ where: { id: In(ids) } })
    const byId = new Map(rows.map(r => [r.id, r]))
    for (const item of dto.items) {
      const entity = byId.get(item.id)
      if (!entity) throw new NotFoundException(`栏目 ${item.id} 不存在`)
      entity.sort = item.sort
      if (item.hidden !== undefined) {
        if (item.hidden) this.assertHideable(entity)
        entity.hidden = item.hidden
      }
    }
    await this.repo.manager.transaction(m => m.save(Channel, [...byId.values()]))
  }

  /**
   * 区块外观：取值域已由 DTO 校验，这里处理「空值即恢复默认」与背景图地址净化
   * 背景图只放行站内路径与 http(s)，挡掉 javascript: 与协议相对地址（会被拼进 CSS url()）
   */
  private applyAppearance(entity: Channel, dto: AppearancePatch): void {
    if (dto.blockTone !== undefined) entity.blockTone = dto.blockTone && dto.blockTone !== 'auto' ? dto.blockTone : null
    if (dto.blockBg !== undefined) {
      const bg = dto.blockBg.trim()
      if (bg && !assetUrl(bg)) throw new BadRequestException('区块背景图地址不合法')
      entity.blockBg = bg || null
    }
    if (dto.blockColumns !== undefined) entity.blockColumns = dto.blockColumns || null
    if (dto.headingAlign !== undefined) entity.headingAlign = dto.headingAlign || null
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
