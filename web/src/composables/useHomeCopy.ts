// 首页文案取值 —— 后台配了用后台的，没配（或接口没返回）用内置文案
// 两套首页模板共用：内置文案集中在这里，避免两边各写一份、改一处漏一处
import { computed, type Ref } from 'vue'
import type { HomeSections, SiteInfo } from '@/api/home'

/** 各板块内置标题：后台对应栏目名/区块副标题为空时使用 */
const DEFAULT_HEADINGS: Record<string, { eyebrow: string; title: string }> = {
  about: { eyebrow: '公司简介', title: '' },
  business: { eyebrow: '业务与行业', title: '覆盖能源全链路的专业服务方向' },
  product: { eyebrow: '主要产品', title: '面向建筑能源全生命周期的核心产品' },
  service: { eyebrow: '技术支持及服务', title: '全周期的专业能源技术服务' },
  philosophy: { eyebrow: '经营理念', title: '' },
  achievement: { eyebrow: '公司业绩', title: '用数据说话的专业积累' },
  partner: { eyebrow: '合作伙伴', title: '与主流品牌携手共建能源生态' },
  view: { eyebrow: '我眼中的中瑞恒', title: '媒体与行业的关注和认可' },
  social: { eyebrow: '社会贡献', title: '践行绿色低碳发展使命' },
}

const DEFAULT_CONTACT = { eyebrow: '联系我们', title: '留下需求，我们尽快与您联系' }
const DEFAULT_HERO_PRIMARY = '了解业务'
const DEFAULT_HERO_SECONDARY = '联系我们'

/**
 * 首页文案
 * @param sections 首页板块数据（含后台配置的板块标题）
 * @param site 站点信息（含首屏按钮与联系板块标题）
 */
export function useHomeCopy(sections: Ref<HomeSections | null | undefined>, site: Ref<Partial<SiteInfo>>) {
  /**
   * 取某板块标题：逐项回落，后台只填了小标题时主标题仍用内置文案
   * @param section 板块标识
   */
  const heading = (section: string) => {
    const fallback = DEFAULT_HEADINGS[section] ?? { eyebrow: '', title: '' }
    const configured = sections.value?.headings?.[section]
    return {
      eyebrow: configured?.eyebrow?.trim() || fallback.eyebrow,
      title: configured?.title?.trim() || fallback.title,
    }
  }

  const contactHeading = computed(() => ({
    eyebrow: DEFAULT_CONTACT.eyebrow,
    title: site.value.contactHeading?.trim() || DEFAULT_CONTACT.title,
  }))
  const heroPrimaryText = computed(() => site.value.heroPrimaryText?.trim() || DEFAULT_HERO_PRIMARY)
  const heroSecondaryText = computed(() => site.value.heroSecondaryText?.trim() || DEFAULT_HERO_SECONDARY)

  return { heading, contactHeading, heroPrimaryText, heroSecondaryText }
}
