// 网站模板取值校验 —— 走 ValidationPipe 内部同一条流程（plainToInstance + validateSync）
// 前台只认 1/2/3 三套模板，后端白名单是唯一拦截点：放进别的值，前台会静默回退样式一，后台却显示保存成功
import { plainToInstance } from 'class-transformer'
import { validateSync } from 'class-validator'
import { SaveSiteConfigDto } from '../src/modules/cms/dto/site-config.dto'

/** 只校验 template 一个字段，取出它的报错 */
function templateErrors(template: unknown) {
  const instance = plainToInstance(SaveSiteConfigDto, { template })
  return validateSync(instance, { whitelist: true }).filter(e => e.property === 'template')
}

describe('SaveSiteConfigDto.template', () => {
  it.each(['1', '2', '3'])('模板 %s 合法', (v) => {
    expect(templateErrors(v)).toHaveLength(0)
  })

  it.each(['4', '0', '', 'dark'])('模板 %p 非法', (v) => {
    const errors = templateErrors(v)
    expect(errors).toHaveLength(1)
    expect(Object.values(errors[0].constraints ?? {})).toContain('网站模板只能为 1、2 或 3')
  })
})
