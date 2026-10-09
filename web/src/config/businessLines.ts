// 业务线展示配置 —— 与后台 admin/src/api/cms.ts 的 BUSINESS_LINE_OPTIONS、后端 BUSINESS_LINES 同一口径
import type { BusinessLine } from '@/api/page'

/** 业务线选项：value 为接口取值，label 为前台展示名 */
export const BUSINESS_LINE_OPTIONS: { label: string; value: BusinessLine }[] = [
  { label: '智慧能源', value: 'energy' },
  { label: '智慧楼宇', value: 'building' },
  { label: '智慧生活', value: 'living' },
]

/**
 * 业务线取值转展示名
 * @param value 接口返回的业务线取值，非法或缺省返回空串
 */
export function businessLabel(value?: string): string {
  return BUSINESS_LINE_OPTIONS.find(o => o.value === value)?.label ?? ''
}
