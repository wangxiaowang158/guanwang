// 上传文件头校验 + 站点配置地址校验 —— 防伪造 MIME 的文件混进素材库、防非法地址入库
import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { matchesMagic } from '../src/modules/upload/upload.service'
import { MgmtUploadController } from '../src/modules/upload/mgmt-upload.controller'
import { getMetadataArgsStorage } from 'typeorm'
import { SaveSiteConfigDto } from '../src/modules/cms/dto/site-config.dto'
import { SiteConfig } from '../src/modules/cms/site-config.entity'
import { SiteConfigService } from '../src/modules/cms/site-config.service'

/** 构造指定前缀、补零到 16 字节的文件头 */
const head = (...parts: Array<number[] | string>): Buffer => {
  const bytes = parts.flatMap(p => (typeof p === 'string' ? [...Buffer.from(p, 'ascii')] : p))
  return Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]).subarray(0, 16)
}

describe('matchesMagic', () => {
  it.each([
    ['image/png', head([0x89], 'PNG')],
    ['image/jpeg', head([0xff, 0xd8, 0xff])],
    ['image/gif', head('GIF89a')],
    ['image/webp', head('RIFF', [0, 0, 0, 0], 'WEBP')],
    ['video/mp4', head([0, 0, 0, 0x20], 'ftypisom')],
    ['video/webm', head([0x1a, 0x45, 0xdf, 0xa3])],
    ['video/ogg', head('OggS')],
  ])('%s 的真实文件头通过', (mime, buf) => {
    expect(matchesMagic(mime, buf)).toBe(true)
  })

  it('声明为 mp4 但内容是 HTML 时拒绝', () => {
    expect(matchesMagic('video/mp4', head('<html><body>'))).toBe(false)
  })

  it('声明为 png 但内容是 jpeg 时拒绝', () => {
    expect(matchesMagic('image/png', head([0xff, 0xd8, 0xff]))).toBe(false)
  })

  it('不足 12 字节的文件拒绝', () => {
    expect(matchesMagic('video/ogg', Buffer.from('OggS'))).toBe(false)
  })

  it('白名单外的 MIME 一律拒绝', () => {
    expect(matchesMagic('image/svg+xml', head('<svg xmlns='))).toBe(false)
  })
})

describe('AI 生图接口 scene 兜底', () => {
  it('scene 为 null 时按 cover 生成，不抛 500', async () => {
    const generate = jest.fn().mockResolvedValue([])
    const ctrl = new MgmtUploadController({} as never, { generate } as never, {} as never)
    await ctrl.aiGenerate({ prompt: '工厂屋顶', scene: null } as never)
    expect(generate).toHaveBeenCalledWith('工厂屋顶', 'cover')
  })
})

describe('SaveSiteConfigDto 地址与邮箱校验', () => {
  const errorsOf = (input: Record<string, unknown>) =>
    validateSync(plainToInstance(SaveSiteConfigDto, input)).map(e => e.property)

  it('空串放行（表示清空）', () => {
    expect(errorsOf({ website: '', contactEmail: '', logo: '', mapLink: '' })).toEqual([])
  })

  it('合法值通过', () => {
    expect(
      errorsOf({
        website: 'https://www.example.com',
        contactEmail: 'hr@example.com',
        logo: '/uploads/202601/a.png',
        heroVideo: 'https://cdn.example.com/a.mp4',
      }),
    ).toEqual([])
  })

  it('邮箱格式错误被拦', () => {
    expect(errorsOf({ recruitEmail: 'not-an-email' })).toEqual(['recruitEmail'])
  })

  it('网站域名可省协议头（存量数据即此写法），伪协议与带路径的被拦', () => {
    expect(errorsOf({ website: 'www.zruiheng.com' })).toEqual([])
    expect(errorsOf({ website: 'http://localhost.test:8081/' })).toEqual([])
    expect(errorsOf({ website: 'javascript:alert(1)' })).toEqual(['website'])
    expect(errorsOf({ website: 'https://a.com/"><script>' })).toEqual(['website'])
    expect(errorsOf({ website: 'localhost' })).toEqual(['website'])
  })

  it('素材地址伪协议、协议相对与 CSS 注入字符被拦', () => {
    expect(errorsOf({ logo: 'javascript:alert(1)' })).toEqual(['logo'])
    expect(errorsOf({ heroImage: '//evil.com/a.png' })).toEqual(['heroImage'])
    expect(errorsOf({ heroImage: "/a.png') no-repeat;background:url('x" })).toEqual(['heroImage'])
  })

  it('base64 内联图被拦', () => {
    expect(errorsOf({ heroImage: 'data:image/png;base64,AAAA' })).toEqual(['heroImage'])
  })

  it('非字符串一律被拦，不会把对象或数字写进库', () => {
    expect(errorsOf({ companyName: 123 })).toEqual(['companyName'])
    expect(errorsOf({ favicon: { a: 1 } })).toEqual(['favicon'])
  })
})

describe('SiteConfigService.save 的 null 处理', () => {
  /** 用假仓库截获 merge 的入参，不连库 */
  const patchOf = async (dto: Record<string, unknown>) => {
    let patch: Record<string, unknown> = {}
    const repo = {
      findOne: async () => ({ id: 1 }),
      merge: (_e: unknown, p: Record<string, unknown>) => ((patch = p), p),
      save: async (x: unknown) => x,
    }
    await new SiteConfigService(repo as never).save(dto as never)
    return patch
  }

  it('NOT NULL 列收到 null 转成空串，可空列保留 null', async () => {
    const p = await patchOf({ webTitle: null, favicon: null, companyName: null, heroImage: null, heroVideo: null })
    expect(p).toEqual({ webTitle: '', favicon: '', companyName: '', heroImage: null, heroVideo: null })
  })

  it('可空列清单与实体元数据一致（新增可空列时须同步）', () => {
    const nullable = getMetadataArgsStorage().columns
      .filter(c => c.target === SiteConfig && c.options.nullable)
      .map(c => c.propertyName)
      // JSON 列在 service 里另行处理，不走 NULLABLE_COLUMNS
      .filter(n => n !== 'homeLayout' && n !== 'footerConfig' && n !== 'extConfig')
      .sort()
    expect(nullable).toEqual(['heroImage', 'heroVideo'])
  })
})
