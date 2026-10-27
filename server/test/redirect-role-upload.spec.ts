// 跳转规则、管理员角色、附件文件头、图片水印 / WebP
import 'reflect-metadata'
import sharp from 'sharp'
import { DataSource, type Repository } from 'typeorm'
import { RedirectRule } from '../src/modules/redirect/redirect.entity'
import { normalizeRedirectPath, RedirectService } from '../src/modules/redirect/redirect.service'
import { Admin } from '../src/modules/admin/admin.entity'
import { AdminRole } from '../src/modules/admin/admin-role.entity'
import { AdminService } from '../src/modules/admin/admin.service'
import { matchesDocMagic } from '../src/modules/upload/upload.service'
import { runImagePipeline } from '../src/modules/upload/image-pipeline'
import { toAttachment } from '../src/modules/cms/vo/cms.vo'

let ds: DataSource

beforeAll(async () => {
  ds = new DataSource({
    type: 'better-sqlite3', database: ':memory:',
    entities: [RedirectRule, Admin, AdminRole], synchronize: true, logging: false,
  })
  await ds.initialize()
})

afterAll(async () => { await ds.destroy() })

describe('跳转规则', () => {
  let repo: Repository<RedirectRule>
  let service: RedirectService

  beforeEach(async () => {
    repo = ds.getRepository(RedirectRule)
    await repo.clear()
    service = new RedirectService(repo)
  })

  it('路径规整：大小写、尾斜杠、查询串、重复斜杠、编码', () => {
    expect(normalizeRedirectPath('/About/?x=1#h')).toBe('/about')
    expect(normalizeRedirectPath('//old//page/')).toBe('/old/page')
    expect(normalizeRedirectPath('/%E6%96%B0%E9%97%BB')).toBe('/新闻')
    expect(normalizeRedirectPath('relative')).toBe('')
    expect(normalizeRedirectPath('/%E0%A4%A')).toBe('')
  })

  it('命中后回目标；站内目标带上原查询串；停用的不生效', async () => {
    await service.save({ fromPath: '/old-news', toUrl: '/news', statusCode: 301 })
    await service.save({ fromPath: '/promo', toUrl: 'https://example.com/a', statusCode: 302 })
    await service.save({ fromPath: '/off', toUrl: '/news', enabled: false })
    expect(await service.resolve('/Old-News/?utm=a')).toEqual({ location: '/news?utm=a', statusCode: 301 })
    expect(await service.resolve('/promo?x=1')).toEqual({ location: 'https://example.com/a', statusCode: 302 })
    expect(await service.resolve('/off')).toBeNull()
    expect(await service.resolve('/nope')).toBeNull()
  })

  it('拒绝：首页、保留前缀、自跳、链式跳转、重复、非法目标', async () => {
    await expect(service.save({ fromPath: '/', toUrl: '/news' })).rejects.toThrow('首页')
    await expect(service.save({ fromPath: '/api/x', toUrl: '/news' })).rejects.toThrow('不能设置跳转')
    await expect(service.save({ fromPath: '/uploads/a.png', toUrl: '/news' })).rejects.toThrow('不能设置跳转')
    await expect(service.save({ fromPath: '/a', toUrl: '/A/' })).rejects.toThrow('相同')
    await expect(service.save({ fromPath: '/a', toUrl: 'javascript:alert(1)' })).rejects.toThrow('新地址')
    await expect(service.save({ fromPath: '/a', toUrl: '//evil.com' })).rejects.toThrow('新地址')
    await service.save({ fromPath: '/b', toUrl: '/c' })
    await expect(service.save({ fromPath: '/a', toUrl: '/b' })).rejects.toThrow('最终地址')
    await expect(service.save({ fromPath: '/B', toUrl: '/d' })).rejects.toThrow('已有跳转规则')
  })

  it('改规则后缓存立即失效', async () => {
    const r = await service.save({ fromPath: '/x', toUrl: '/one' })
    expect((await service.resolve('/x'))?.location).toBe('/one')
    await service.save({ id: r.id, fromPath: '/x', toUrl: '/two' })
    expect((await service.resolve('/x'))?.location).toBe('/two')
    await service.remove([r.id])
    expect(await service.resolve('/x')).toBeNull()
  })
})

describe('管理员角色', () => {
  let service: AdminService
  let adminRepo: Repository<Admin>

  beforeEach(async () => {
    adminRepo = ds.getRepository(Admin)
    const roleRepo = ds.getRepository(AdminRole)
    await adminRepo.clear()
    await roleRepo.clear()
    service = new AdminService(adminRepo, roleRepo)
  })

  it('最终权限 = 角色 ∪ 自身；改角色立即生效', async () => {
    const role = await service.saveRole({ name: '内容编辑', perms: ['新闻资讯', '解决方案'] })
    const a = await service.create({ account: 'editor', name: '编辑甲', password: 'Passw0rd!', perms: ['素材库'], roleId: role.id })
    expect((await service.effectivePerms(a)).sort()).toEqual(['新闻资讯', '素材库', '解决方案'].sort())
    await service.saveRole({ id: role.id, name: '内容编辑', perms: ['新闻资讯'] })
    expect((await service.effectivePerms(a)).sort()).toEqual(['新闻资讯', '素材库'].sort())
  })

  it('不存在的角色不能指派；在用的角色不能删；重名被拒', async () => {
    await expect(service.create({ account: 'x1', name: '某某', password: 'Passw0rd!', roleId: 999 })).rejects.toThrow('角色不存在')
    const role = await service.saveRole({ name: '运营', perms: [] })
    await expect(service.saveRole({ name: '运营', perms: [] })).rejects.toThrow('已存在')
    const a = await service.create({ account: 'x2', name: '某某', password: 'Passw0rd!', roleId: role.id })
    await expect(service.removeRole(role.id)).rejects.toThrow('1 个账号')
    await service.update(a.id, { id: a.id, roleId: null })
    await expect(service.removeRole(role.id)).resolves.toBeUndefined()
  })

  it('角色列表带使用账号数', async () => {
    const role = await service.saveRole({ name: '审核', perms: ['新闻资讯'] })
    await service.create({ account: 'r1', name: '甲甲', password: 'Passw0rd!', roleId: role.id })
    await service.create({ account: 'r2', name: '乙乙', password: 'Passw0rd!', roleId: role.id })
    const [row] = await service.listRoles()
    expect(row.adminCount).toBe(2)
  })
})

describe('附件', () => {
  it('文件头与扩展名须一致', () => {
    expect(matchesDocMagic('.pdf', Buffer.from('%PDF-1.7\n....'))).toBe(true)
    expect(matchesDocMagic('.pdf', Buffer.from('MZ\x90\x00\x03\x00\x00\x00'))).toBe(false)
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
    expect(matchesDocMagic('.doc', ole)).toBe(true)
    expect(matchesDocMagic('.pdf', ole)).toBe(false)
    const ooxml = Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(26), Buffer.from('[Content_Types].xml')])
    expect(matchesDocMagic('.docx', ooxml)).toBe(true)
    // 普通 zip 改扩展名混不进来
    expect(matchesDocMagic('.docx', Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(26), Buffer.from('evil.exe')]))).toBe(false)
    expect(matchesDocMagic('.exe', Buffer.from('MZ......'))).toBe(false)
  })

  it('出库只放行站内上传与 http(s)', () => {
    expect(toAttachment('/uploads/202610/a.pdf')).toEqual({ url: '/uploads/202610/a.pdf', ext: 'PDF' })
    expect(toAttachment('https://cdn.example.com/x.docx?v=1')).toEqual({ url: 'https://cdn.example.com/x.docx?v=1', ext: 'DOCX' })
    expect(toAttachment('javascript:alert(1)')).toBeUndefined()
    expect(toAttachment('/etc/passwd')).toBeUndefined()
    expect(toAttachment('')).toBeUndefined()
  })
})

describe('图片加工', () => {
  const makeJpeg = (w: number, h: number) =>
    sharp({ create: { width: w, height: h, channels: 3, background: '#336699' } }).jpeg().toBuffer()

  it('两项都关时原样返回', async () => {
    const src = await makeJpeg(400, 300)
    const out = await runImagePipeline(src, 'image/jpeg', { webp: false })
    expect(out.processed).toBe(false)
    expect(out.buffer).toBe(src)
  })

  it('加水印后像素有变化，尺寸不变', async () => {
    const src = await makeJpeg(800, 600)
    const out = await runImagePipeline(src, 'image/jpeg', { webp: false, watermark: { text: 'ZRH <测试>', position: 'bottom-right' } })
    expect(out.processed).toBe(true)
    const meta = await sharp(out.buffer).metadata()
    expect([meta.width, meta.height]).toEqual([800, 600])
    const { channels: [, , b] } = await sharp(out.buffer).stats()
    const { channels: [, , b0] } = await sharp(src).stats()
    expect(b.max).toBeGreaterThan(b0.max)
  })

  it('转 WebP，超宽图压到 2560', async () => {
    const out = await runImagePipeline(await makeJpeg(4000, 1000), 'image/jpeg', { webp: true })
    expect(out.mime).toBe('image/webp')
    const meta = await sharp(out.buffer).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(2560)
  })

  it('GIF 与小图不加水印', async () => {
    const gif = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#fff' } }).gif().toBuffer()
    expect((await runImagePipeline(gif, 'image/gif', { webp: true })).processed).toBe(false)
    const small = await makeJpeg(120, 120)
    const out = await runImagePipeline(small, 'image/jpeg', { webp: false, watermark: { text: 'x', position: 'center' } })
    // 小图仍按原格式重新编码（去 EXIF），但不叠水印：尺寸不变
    expect((await sharp(out.buffer).metadata()).width).toBe(120)
  })
})
