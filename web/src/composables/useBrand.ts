// 品牌名称取值 —— 后台「基本信息」填了用后台的，没填用 config/brand.ts 的内置值
// 页头、页脚、首页标签、隐私政策共用，避免各处各自判断空值
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSiteStore } from '@/stores/site'
import { COMPANY_EN, COMPANY_NAME, COMPANY_SHORT, defaultCopyright } from '@/config/brand'

export function useBrand() {
  const { site } = storeToRefs(useSiteStore())

  /** 公司全称：版权兜底、隐私政策主体 */
  const companyName = computed(() => site.value.companyName?.trim() || COMPANY_NAME)
  /** 公司简称：未配置 Logo 时的文字标识、Logo 的替代文字 */
  const companyShort = computed(() => site.value.companyShort?.trim() || COMPANY_SHORT)
  /** 文字标识下方的英文辅助字 */
  const companyEn = computed(() => site.value.companyEn?.trim() || COMPANY_EN)
  /** 后台未填版权信息时的兜底文案 */
  const copyrightFallback = computed(() => defaultCopyright(companyName.value))

  return { companyName, companyShort, companyEn, copyrightFallback }
}
