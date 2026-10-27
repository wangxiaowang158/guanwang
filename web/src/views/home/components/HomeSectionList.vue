<template>
  <!-- 首屏之后的首页板块：顺序、显隐、标题、底色由 useHomeLayout 按后台「首页布局」算好，这里只按序渲染 -->
  <template v-for="s in sections" :key="s.key">
    <HomeBusinessTrio v-if="s.key === 'business-trio'" :briefs="briefs" v-bind="common(s)" />
    <HomeAdvantages v-else-if="s.key === 'advantage'" :items="data?.advantages ?? []" v-bind="common(s)" />
    <template v-else-if="s.key === 'case'">
      <HomeCases :items="cases" v-bind="common(s)" />
      <!-- 看完案例顺手留资：价值主张 + 预约按钮，与栏目页页尾通栏同一组件 -->
      <ChannelCtaBand source="首页案例" :style2="style2" />
    </template>
    <HomeNews v-else-if="s.key === 'news'" :items="news" v-bind="common(s)" />
    <HomePartners v-else-if="s.key === 'partner'" :items="data?.partners ?? []" v-bind="common(s)" :tone="lightTone(s)" />
    <HomeViews v-else-if="s.key === 'view'" :items="data?.views ?? []" v-bind="common(s)" />
    <HomeContact v-else-if="s.key === 'contact'" :site="site" v-bind="common(s)" :tone="lightTone(s)" />
  </template>
</template>

<script setup lang="ts">
// 两套首页共用的板块列表；各板块外观仍在各自组件里，style2 切换样式二
import type { HomeSections, SiteInfo } from '@/api/home'
import type { PageItem } from '@/api/page'
import type { RenderedSection } from '@/composables/useHomeLayout'
import type { BusinessBrief } from '@/composables/useHomeShowcase'
import ChannelCtaBand from '@/components/sections/ChannelCtaBand.vue'
import HomeAdvantages from './HomeAdvantages.vue'
import HomeBusinessTrio from './HomeBusinessTrio.vue'
import HomeCases from './HomeCases.vue'
import HomeContact from './HomeContact.vue'
import HomeNews from './HomeNews.vue'
import HomePartners from './HomePartners.vue'
import HomeViews from './HomeViews.vue'

const props = defineProps<{
  /** useHomeLayout 算出的实际渲染板块 */
  sections: RenderedSection[]
  /** 首页聚合数据 */
  data: HomeSections | null
  site: Partial<SiteInfo>
  briefs: BusinessBrief[]
  news: PageItem[]
  cases: PageItem[]
  style2?: boolean
}>()

const common = (s: RenderedSection) => ({ eyebrow: s.eyebrow, title: s.title, tone: s.tone, style2: props.style2 })

/** 战略合作、联系直接压在底色上，深色底不可读：后端已拦，这里再兜一道 */
const lightTone = (s: RenderedSection): 'white' | 'surface' => (s.tone === 'dark' ? 'surface' : s.tone)
</script>
