// 品牌常量 —— 系统内置文案中的公司名称统一出口（SRS 3.5.1「公司名称统一」）
// 后台维护的内容（版权信息等）按管理员填写原样展示，不受此处约束；
// 这里只管「后台没填时系统自己兜底写出来的那一句」，保证全站只有一个主体名称

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
export function defaultCopyright(): string {
  return `© ${new Date().getFullYear()} ${COMPANY_NAME} 版权所有`
}
