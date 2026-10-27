// 品牌常量 —— 系统内置文案中的公司名称统一出口（SRS 3.5.1「公司名称统一」）
// 后台「基本信息 → 品牌与模板」可覆盖公司名称，组件经 useBrand 取值；
// 这里只是后台没填（或接口未返回）时的兜底，保证全站只有一个主体名称

/** 公司全称：版权兜底、隐私政策主体 */
export const COMPANY_NAME = '北京中瑞恒有限责任公司'

/** 公司简称：未配置 Logo 时的文字标识 */
export const COMPANY_SHORT = '中瑞恒'

/** 文字标识下方的英文辅助字 */
export const COMPANY_EN = 'ZRUIHENG'

/**
 * 版权声明兜底文案：后台未填写版权信息时展示
 * 年份取当前年，避免写死后每年都要改代码
 */
export function defaultCopyright(companyName: string = COMPANY_NAME): string {
  return `© ${new Date().getFullYear()} ${companyName} 版权所有`
}
