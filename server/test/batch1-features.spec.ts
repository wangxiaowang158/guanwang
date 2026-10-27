// 第一批升级：复制为草稿、批量发布下线、相关推荐、留言推送配置
import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { DataSource, type Repository } from 'typeorm'
import { Channel } from '../src/modules/cms/channel.entity'
import { Content } from '../src/modules/cms/content.entity'
import { ContentService } from '../src/modules/cms/content.service'
import { BatchStatusDto } from '../src/modules/cms/dto/content.dto'
import { pickRelated } from '../src/modules/cms/related-content'
import { NotifyConfig } from '../src/modules/feedback/notify-config.entity'
import { FeedbackNotifyService } from '../src/modules/feedback/feedback-notify.service'
import { checkWebhook, maskWebhook } from '../src/modules/feedback/notify-webhook'
import { CHANNEL_TYPE, CONTENT_STATUS } from '../src/common/enums'

let ds: DataSource
let contentRepo: Repository<Content>
let service: ContentService

beforeAll(async () => {
  ds = new DataSource({
    type: 'better-sqlite3', database: ':memory:',
    entities: [Channel, Content, NotifyConfig], synchronize: true, logging: false,
  })
  await ds.initialize()
  contentRepo = ds.getRepository(Content)
  const channelRepo = ds.getRepository(Channel)
  await channelRepo.save(channelRepo.create({ key: 'case', name: '案例', type: CHANNEL_TYPE.LIST, sort: 1 }))
  await channelRepo.save(channelRepo.create({ key: 'news', name: '新闻', type: CHANNEL_TYPE.LIST, sort: 2 }))
  service = new ContentService(contentRepo, channelRepo)
})

afterAll(async () => { await ds.destroy() })

describe('复制为草稿', () => {
  it('副本是草稿、不置顶、无发布时间，标题加（副本），字段与扩展数据照搬', async () => {
    const src = await contentRepo.save(contentRepo.create({
      channelKey: 'case', title: '某园区改造', cover: '/uploads/a.png', content: '<p>正文</p>',
      extra: JSON.stringify({ business: 'energy' }), status: CONTENT_STATUS.PUBLISHED, isTop: true,
      publishAt: new Date('2026-01-01T00:00:00'), sort: 7,
    }))
    const copy = await service.duplicate('case', src.id)
    expect(copy.id).not.toBe(src.id)
    expect(copy).toMatchObject({
      title: '某园区改造（副本）', cover: '/uploads/a.png', content: '<p>正文</p>',
      status: CONTENT_STATUS.DRAFT, isTop: false, publishAt: null, sort: 7, extra: src.extra,
    })
  })

  it('跨栏目复制不到（只认本栏目下的 id）', async () => {
    const src = await contentRepo.save(contentRepo.create({ channelKey: 'news', title: 'n', status: CONTENT_STATUS.PUBLISHED }))
    await expect(service.duplicate('case', src.id)).rejects.toThrow('内容不存在')
  })
})

describe('批量发布 / 下线', () => {
  it('只改本栏目、只计实际变化的条数', async () => {
    const a = await contentRepo.save(contentRepo.create({ channelKey: 'case', title: 'a', status: CONTENT_STATUS.DRAFT }))
    const b = await contentRepo.save(contentRepo.create({ channelKey: 'case', title: 'b', status: CONTENT_STATUS.PUBLISHED }))
    const other = await contentRepo.save(contentRepo.create({ channelKey: 'news', title: 'x', status: CONTENT_STATUS.DRAFT }))
    const changed = await service.setStatus('case', [a.id, b.id, other.id], CONTENT_STATUS.PUBLISHED)
    expect(changed).toBe(1)
    expect((await contentRepo.findOneByOrFail({ id: a.id })).status).toBe(CONTENT_STATUS.PUBLISHED)
    expect((await contentRepo.findOneByOrFail({ id: other.id })).status).toBe(CONTENT_STATUS.DRAFT)
  })

  it('DTO：空数组、超 200 条、非法状态都被拒', () => {
    const errs = (o: object) => validateSync(plainToInstance(BatchStatusDto, o)).map(e => e.property)
    expect(errs({ channelKey: 'case', ids: [], status: 'published' })).toEqual(['ids'])
    expect(errs({ channelKey: 'case', ids: Array.from({ length: 201 }, (_, i) => i + 1), status: 'draft' })).toEqual(['ids'])
    expect(errs({ channelKey: 'case', ids: [1], status: 'deleted' })).toEqual(['status'])
    expect(errs({ channelKey: 'case', ids: [1, 2], status: 'draft' })).toEqual([])
  })
})

describe('相关推荐', () => {
  const mk = (id: number, extra: object | null, title = `t${id}`) =>
    Object.assign(new Content(), { id, title, name: null, cover: null, extra: extra ? JSON.stringify(extra) : null })

  it('同业务线、同行业的排前；同分保持列表顺序；排除自身；至多 4 条', () => {
    const cur = mk(1, { business: 'energy', industries: ['医院'] })
    const list = [
      mk(1, { business: 'energy' }),
      mk(2, null),
      mk(3, { business: 'building', industries: ['医院'] }),
      mk(4, { business: 'energy', industries: ['医院'] }),
      mk(5, { business: 'energy' }),
      mk(6, null),
      mk(7, null),
    ]
    expect(pickRelated(cur, list).map(r => r.id)).toEqual([4, 5, 3, 2])
  })

  it('一句成效取第一个量化指标', () => {
    const cur = mk(1, null)
    const r = pickRelated(cur, [mk(2, { metrics: [{ label: '综合节能率', value: '32', unit: '%' }] })])
    expect(r[0].highlight).toBe('综合节能率 32%')
  })
})

describe('留言推送地址', () => {
  it('只放行三家官方 https 域名，挡住内网与改过的地址', () => {
    expect(checkWebhook('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc', 'wecom')).toBeNull()
    expect(checkWebhook('https://oapi.dingtalk.com/robot/send?access_token=x', 'dingtalk')).toBeNull()
    expect(checkWebhook('https://open.feishu.cn/open-apis/bot/v2/hook/x', 'feishu')).toBeNull()
    expect(checkWebhook('http://qyapi.weixin.qq.com/x', 'wecom')).not.toBeNull()
    expect(checkWebhook('https://127.0.0.1/x', 'wecom')).not.toBeNull()
    expect(checkWebhook('https://qyapi.weixin.qq.com.evil.com/x', 'wecom')).not.toBeNull()
    expect(checkWebhook('https://u:p@qyapi.weixin.qq.com/x', 'wecom')).not.toBeNull()
    expect(checkWebhook('https://qyapi.weixin.qq.com:8443/x', 'wecom')).not.toBeNull()
    // 类型与域名须对应：企业微信地址不能当钉钉用
    expect(checkWebhook('https://qyapi.weixin.qq.com/x', 'dingtalk')).not.toBeNull()
  })

  it('打码后不含密钥原文', () => {
    const masked = maskWebhook('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=SECRET-1234567890')
    expect(masked).not.toContain('SECRET')
    expect(masked.startsWith('https://qyapi.weixin.qq.com')).toBe(true)
  })

  it('后台保存后生效、只改类型保留地址、清空后回落「未配置」', async () => {
    const svc = new FeedbackNotifyService(ds.getRepository(NotifyConfig))
    expect((await svc.getConfig()).from).toBe('none')
    await svc.saveConfig('wecom', 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abcdefghij')
    expect((await svc.getConfig()).from).toBe('admin')
    await expect(svc.saveConfig('dingtalk')).rejects.toThrow('官方地址')
    await svc.saveConfig('wecom', '')
    expect((await svc.getConfig()).from).toBe('none')
  })
})
