<template>
  <!-- 通用栏目页：头图（含当前位置）+ 各内容块；条目类区块支持分类筛选与页码翻页，按当前模板切换呈现 -->
  <div>
    <!-- 草稿预览条：后台「预览」打开时出现，提醒这不是对外看到的样子 -->
    <div v-if="content?.preview" class="cp-preview" role="status">
      预览模式：本页包含未发布的草稿，仅持有预览链接的人可见，链接 30 分钟内有效
    </div>
    <component
      :is="heroComp"
      v-if="content"
      :eyebrow="content.hero.eyebrow"
      :title="content.hero.title"
      :desc="content.hero.desc"
      :bg="content.hero.bg || fallbackImage"
      :video="content.hero.video"
      :crumb="channelName"
    >
      <!-- 三个业务页的页头转化入口：预约线上演示 -->
      <template v-if="showDemoCta" #actions>
        <button type="button" class="cp-cta" :class="{ 'cp-cta--style2': theme.isStyle2 }" @click="openLead('productDemo', `${channelName}页头`)">
          预约线上演示
        </button>
      </template>
    </component>

    <!-- 加载态：头图高度占位 + 条目骨架，避免页脚先顶上来 -->
    <div v-if="loading" class="site-container py-24">
      <SkeletonRows :rows="3" />
    </div>

    <template v-else-if="content">
      <!-- 页内目录：有标题的区块达到 3 个才出，短页面不需要 -->
      <ChannelSubNav v-if="subNavItems.length >= SUBNAV_MIN" :items="subNavItems" :style2="theme.isStyle2" />
      <section
        v-for="(block, i) in visibleBlocks"
        :key="block.anchor"
        class="relative bg-cover bg-center"
        :class="sectionClass(i)"
        :style="sectionStyle(block, i)"
      >
        <!-- 分类栏目不独立成块，但导航子菜单仍指向它的锚点：把锚点挂到被筛选区块顶部，
             点「产品类别」「行业分类」直接落到对应的筛选条上 -->
        <span v-for="alias in aliasAnchorsOf(block)" :id="alias" :key="alias" class="block h-0" aria-hidden="true"></span>
        <div v-if="block.bg" class="absolute inset-0 bg-black/55 pointer-events-none" aria-hidden="true"></div>
        <!-- 进入视口淡入上移：底色与背景图随 section 立即铺满，只有内容做入场 -->
        <div
          :ref="reveal.track(block.anchor)"
          class="relative fade-up"
          :class="[theme.isStyle2 ? 'rs-channel-container' : 'site-container', { visible: reveal.shown.has(block.anchor) }]"
        >
          <component :is="blockComp" :block="block" :on-dark="onDark(i)" :fallback-image="fallbackImage">
            <!-- 筛选条插在区块标题与条目之间（SRS：条目少于 12 条或无分类时不提供） -->
            <template #filter>
              <!-- 多标签组合筛选：业务线 / 行业 / 标签，不受 12 条门槛限制 -->
              <MultiFilterBar
                v-if="multiRuleOf(block)"
                :dimensions="multiDimensionsOf(block)"
                :selected="multi.selectedOf(block)"
                :on-dark="onDark(i)"
                :loading="paging.state(block).loading"
                :style2="theme.isStyle2"
                @toggle="(p) => multi.toggle(block, p.dimension, p.value)"
                @clear="multi.clear(block)"
              />
              <ChannelFilterBar
                v-if="paging.filterEnabled(block)"
                :options="filterOptionsOf(block)"
                :active="paging.state(block).category"
                :on-dark="onDark(i)"
                :loading="paging.state(block).loading"
                :style2="theme.isStyle2"
                @select="(value) => paging.setQuery(block, { category: value })"
              />
            </template>
            <template v-if="paging.state(block).category && !block.items.length" #empty>
              <EmptyState text="该分类下暂无内容" :on-dark="onDark(i)" />
            </template>
            <template v-else-if="multiRuleOf(block) && multi.hasSelection(block) && !block.items.length" #empty>
              <EmptyState text="没有符合所选条件的内容，请调整筛选" :on-dark="onDark(i)">
                <button type="button" class="cp-clear" @click="multi.clear(block)">清空筛选</button>
              </EmptyState>
            </template>
          </component>

          <p v-if="paging.state(block).failed" class="mt-6 text-center text-sm" :class="onDark(i) ? 'text-white' : 'text-ink-500'" role="alert">
            加载失败，请稍后重试
          </p>
          <ChannelPagination
            v-if="isPagedBlock(block) && totalPages(block) > 1"
            :current="paging.state(block).page"
            :total="totalPages(block)"
            :label="block.heading"
            :loading="paging.state(block).loading"
            :style2="theme.isStyle2"
            :on-dark="onDark(i)"
            @change="(p) => paging.setQuery(block, { page: p })"
          />
        </div>
      </section>
      <div v-if="!visibleBlocks.length" class="site-container py-24">
        <EmptyState />
      </div>
      <!-- 页尾咨询通栏：新闻资讯页不放（读者是来看资讯的，不是来找方案的） -->
      <ChannelCtaBand v-if="visibleBlocks.length && !CTA_EXCLUDE_KEYS.has(resolvedKey)" :source="channelName" :style2="theme.isStyle2" />
    </template>

    <!-- 栏目已下线：与网络失败区分，不给重试（重试也不会有），并禁止收录 -->
    <div v-else-if="previewExpired" class="site-container py-32">
      <EmptyState text="预览链接已过期或无效，请回后台重新点「预览」" />
    </div>

    <div v-else-if="notFound" class="site-container py-32">
      <EmptyState text="该页面不存在或已下线">
        <RouterLink to="/" class="mt-4 inline-flex items-center px-5 h-10 text-sm rounded-md border border-line text-ink-700 hover:border-brand-600 hover:text-brand-600">
          返回首页
        </RouterLink>
      </EmptyState>
    </div>

    <div v-else class="site-container py-32">
      <EmptyState text="内容加载失败，请稍后重试">
        <button type="button" class="mt-4 px-5 h-10 text-sm rounded-md border border-line text-ink-700 hover:border-brand-600 hover:text-brand-600" @click="load(target)">
          重新加载
        </button>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
// 数据驱动的栏目页容器：所有一级栏目页复用，仅传入 pageKey；分页与筛选状态见 useChannelPaging
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { clearPageSeo, setChannelSeoKey, setPageSeo } from '@/composables/useSeo'
import { setChannelHeroReady } from '@/composables/useChannelHero'
import { getPageContent, getBlockItems } from '@/api/page'
import type { PageBlock, PageContent } from '@/api/page'
import { recordVisit } from '@/api/home'
import { API_SUCCESS_CODE } from '@/config'
import { useThemeStore } from '@/stores/theme'
import { useSiteStore } from '@/stores/site'
import { filterRulesOf } from '@/config/channelFilters'
import { multiFilterRulesOf } from '@/config/multiFilters'
import type { MultiFilterRule } from '@/config/multiFilters'
import { defaultImageOf } from '@/config/defaultImages'
import { useChannelPaging, isPagedBlock, totalPages } from '@/composables/useChannelPaging'
import { useMultiFilter } from '@/composables/useMultiFilter'
import { useLeadModal } from '@/composables/useLeadModal'
import { useReveal } from '@/composables/useReveal'
import { useBlockTones } from '@/composables/useBlockTones'
import { useMultiFilterOptions } from '@/composables/useMultiFilterOptions'
import type { MenuNode } from '@/api/menu'
import SkeletonRows from '@/components/common/SkeletonRows.vue'
import MultiFilterBar from './MultiFilterBar.vue'
import { blockHasContent, isExtraLayout } from './blockExtra'
import PageHero from './PageHero.vue'
import ContentBlock from './ContentBlock.vue'
import Style2PageHero from './Style2PageHero.vue'
import Style2ContentBlock from './Style2ContentBlock.vue'
import ChannelFilterBar from './ChannelFilterBar.vue'
import type { FilterOption } from './ChannelFilterBar.vue'
import ChannelPagination from './ChannelPagination.vue'
import EmptyState from './EmptyState.vue'
import ChannelSubNav, { type SubNavItem } from './ChannelSubNav.vue'
import ChannelCtaBand from './ChannelCtaBand.vue'

/**
 * 二选一：pageKey（固定路由的栏目页）或 pagePath（通用路由，按地址取后台新建的页面）
 */
const props = defineProps<{ pageKey?: string; pagePath?: string }>()

const theme = useThemeStore()
// 区块入场：按锚点记录已显现的区块，翻页或筛选后同一区块不会再闪一次
const reveal = useReveal()
const siteStore = useSiteStore()
const router = useRouter()

/**
 * 当前页面的栏目 key：固定路由直接给；通用路由要等接口返回才知道。
 * 筛选规则、缺省配图、SEO 都按它取
 */
const resolvedKey = ref(props.pageKey ?? '')

/** 在菜单树里按 key 找节点：业务三页等挂在别的菜单项下，需逐层查找 */
function findMenuNode(nodes: MenuNode[], key: string): MenuNode | undefined {
  for (const n of nodes) {
    if (n.key === key) return n
    const hit = n.children ? findMenuNode(n.children, key) : undefined
    if (hit) return hit
  }
  return undefined
}

// 当前位置显示栏目名（导航上的名字），而非头图主标题——主标题常是一句宣传语
const channelName = computed(() =>
  findMenuNode(siteStore.menu, resolvedKey.value)?.label || content.value?.name || content.value?.hero.title || '')

const { openLead } = useLeadModal()
/** 需要在页头放「预约线上演示」入口的业务页 */
const DEMO_CTA_KEYS = new Set(['business-energy', 'business-building', 'business-living'])
const showDemoCta = computed(() => DEMO_CTA_KEYS.has(resolvedKey.value))
/** 不放页尾咨询通栏的页面 */
const CTA_EXCLUDE_KEYS = new Set(['news'])
/** 页内目录最少几段才显示 */
const SUBNAV_MIN = 3
/** 页内目录项：只取有标题的区块，标题即目录文字 */
const subNavItems = computed<SubNavItem[]>(() =>
  visibleBlocks.value.filter(b => b.heading?.trim()).map(b => ({ anchor: b.anchor, label: b.heading.trim() })),
)
const heroComp = computed(() => (theme.isStyle2 ? Style2PageHero : PageHero))
const blockComp = computed(() => (theme.isStyle2 ? Style2ContentBlock : ContentBlock))
/** 本栏目的缺省配图：头图未配 Banner、图文条目未配图时显示 */
const fallbackImage = computed(() => defaultImageOf(resolvedKey.value))

/**
 * 改版下线的旧地址：页面在后台被隐藏后，旧链接与搜索结果直接带到新页面，而不是落到「页面不存在」。
 * 只在后端答复「不存在」时生效——运营在后台重新显示该页面后，旧地址照常打开原页面
 */
const LEGACY_REDIRECTS: Record<string, string> = {
  '/products': '/energy-solutions',
  '/solutions': '/energy-solutions/overview',
  '/case': '/business/energy#cases',
}


const content = ref<PageContent | null>(null)
const loading = ref(true)
/** 后端返回 404：栏目不存在或已下线，与网络失败分开展示 */
const notFound = ref(false)
/** 后端「不存在」的业务码；异常统一 HTTP 200 + 响应体 code */
const NOT_FOUND_CODE = 404
/** 预览模式下加 referrer=no-referrer 元标签，离开预览即移除 */
function setNoReferrer(on: boolean) {
  const existing = document.head.querySelector('meta[name="referrer"][data-preview]')
  if (!on) {
    existing?.remove()
    return
  }
  if (existing) return
  const meta = document.createElement('meta')
  meta.name = 'referrer'
  meta.content = 'no-referrer'
  meta.dataset.preview = '1'
  document.head.appendChild(meta)
}

/** 预览令牌无效或过期 */
const FORBIDDEN_CODE = 403

/** 地址里的预览令牌（后台「预览」打开时带上） */
const previewToken = computed(() => {
  const v = router.currentRoute.value.query.preview
  return typeof v === 'string' ? v : undefined
})
const previewExpired = ref(false)

/** 分类选项，按分类栏目 key 归档（取全量，首屏那一页可能不全） */
const categoryTitles = ref<Record<string, string[]>>({})

/** 分类是运营维护的少量枚举，一次取到后端单页上限即足够 */
const OPTION_FETCH_SIZE = 100

const rules = computed(() => filterRulesOf(resolvedKey.value))

/** 被筛选区块对应的分类名列表 */
function categoriesOf(block: PageBlock): string[] {
  const rule = rules.value.find(r => r.target === block.channelKey)
  return rule ? categoryTitles.value[rule.source] ?? [] : []
}

// 多标签组合筛选：规则按栏目登记，只有登记过的区块才带筛选参数，防止手改地址筛到不该筛的区块
const multi = useMultiFilter()
const multiRules = computed(() => multiFilterRulesOf(resolvedKey.value))
const multiRuleOf = (block: PageBlock): MultiFilterRule | undefined =>
  multiRules.value.find(r => r.target === block.channelKey)

const paging = useChannelPaging(content, categoriesOf, block => (multiRuleOf(block) ? multi.paramsOf(block) : {}))

function filterOptionsOf(block: PageBlock): FilterOption[] {
  return categoriesOf(block).map(title => ({ label: title, value: title }))
}

// 多标签筛选的候选项（业务线/行业/标签）：见 useMultiFilterOptions
const { dimensionsOf: multiDimensionsOf, loadTagOptions, resetTagOptions } =
  useMultiFilterOptions(multiRules, multiRuleOf, b => multi.selectedOf(b))

/**
 * 参与渲染的区块
 * 充当筛选器的分类栏目不独立成块——它的条目已变成目标区块上方的筛选项
 */
const visibleBlocks = computed(() => {
  if (!content.value) return []
  const sources = new Set(rules.value.map(r => r.source))
  // 结构化区块无数据时整段不渲染，避免只剩一圈空白留白
  return content.value.blocks.filter(b => !sources.has(b.channelKey) && (!isExtraLayout(b.layout) || blockHasContent(b)))
})

// 区块底色交替与深色反白：见 useBlockTones
const { onDark, sectionClass, sectionStyle } = useBlockTones(visibleBlocks, () => theme.isStyle2)

/** 以该区块为筛选目标的分类栏目的锚点 */
function aliasAnchorsOf(block: PageBlock): string[] {
  if (!content.value) return []
  const sourceKeys = rules.value.filter(r => r.target === block.channelKey).map(r => r.source)
  return content.value.blocks.filter(b => sourceKeys.includes(b.channelKey)).map(b => b.anchor)
}

/** 取全部分类名；首屏只下发了一页时补取完整列表 */
async function loadCategories(page: PageContent): Promise<void> {
  const result: Record<string, string[]> = {}
  await Promise.all(rules.value.map(async (rule) => {
    const source = page.blocks.find(b => b.channelKey === rule.source)
    if (!source) return
    let items = source.items
    if (source.total > source.items.length) {
      try {
        const res = await getBlockItems(rule.source, 1, OPTION_FETCH_SIZE)
        if (res.code === API_SUCCESS_CODE && res.data) items = res.data.items
      } catch {
        // 取不到就沿用首屏那一页：选项不全好过筛选条整个消失
      }
    }
    result[rule.source] = items.map(it => it.title).filter(Boolean)
  }))
  categoryTitles.value = result
}

/** 加载序号：多条路由共用本组件，快速切换栏目时只采纳最新一次的响应 */
let loadSeq = 0

/** 页面标识：固定路由按 key，通用路由按地址 */
const target = computed(() => (props.pageKey ? { key: props.pageKey } : { path: props.pagePath ?? '' }))

/** 规整后的当前地址（去尾斜杠、小写），用于旧地址重定向与防止自我跳转 */
const normalizedPath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p).toLowerCase()

/**
 * 发起跳转（分组页 → 首个子页、旧地址 → 新页面）
 * 只跟一跳：跳转后的页面若又要求跳转，不再跟随，防止后台配置出 A→B→A 时无限跳。
 * 跳转期间保持 loading，不让页面在新路由接管前闪出「加载失败」
 * @returns 是否已发起跳转
 */
let followedRedirect = false
function redirectTo(to: string): boolean {
  if (followedRedirect) return false
  // 同路径（只差 hash/query）时路由 target 不变、不会重新加载，跳了反而停在空页
  if (normalizedPath(to.split(/[?#]/)[0]) === normalizedPath(router.currentRoute.value.path)) return false
  followedRedirect = true
  void router.replace(to)
  return true
}

async function load(t: { key?: string; path?: string }) {
  const seq = ++loadSeq
  // 本次加载是否由上一次跳转引起：是则本次不再跟随跳转（只跟一跳），之后的正常导航恢复
  const isRedirectHop = followedRedirect
  followedRedirect = false
  let redirected = false
  loading.value = true
  content.value = null
  notFound.value = false
  previewExpired.value = false
  // 地址里带着预览令牌时，从发请求起就不带 Referer（包括令牌失效的情况）
  setNoReferrer(!!previewToken.value)
  clearPageSeo()
  // 换栏目时先清掉上一页的 SEO 标识：请求失败或不存在时不能沿用上一页的标题与描述
  resolvedKey.value = t.key ?? ''
  setChannelSeoKey(t.key ?? null)
  categoryTitles.value = {}
  resetTagOptions()
  paging.reset()
  try {
    const res = await getPageContent(t, previewToken.value)
    if (seq !== loadSeq) return
    if (res.code === API_SUCCESS_CODE && res.data) {
      // 分组页（如「智慧能源解决方案」）自身无区块：直接落到其下第一个页面
      if (res.data.redirect && !isRedirectHop && redirectTo(res.data.redirect)) {
        redirected = true
        return
      }
      resolvedKey.value = res.data.key
      setChannelSeoKey(res.data.key)
      // 访问埋点按栏目 key 归集，统一在拿到内容后记（固定路由与通用路由同口径）；后台预览草稿不计入访问统计
      if (!res.data.preview) recordVisit(res.data.key).catch(() => {})
      // 先拿到分类与标签选项再按地址同步：地址里的分类要与可选分类比对，拿不到就判不了是否有效
      await Promise.all([loadCategories(res.data), loadTagOptions(res.data)])
      if (seq !== loadSeq) return
      if (res.data.preview) {
        // 地址里带着预览令牌：本页发出的任何请求都不带 Referer，令牌不随外链或第三方资源带出去
        setNoReferrer(true)
        // 预览只看首屏：分页与补全走续页接口，那边只认已发布，会把草稿换掉；按首屏条数封顶就都不会触发
        res.data.blocks.forEach(b => { b.total = b.items.length })
        setPageSeo({ title: `预览 · ${res.data.name ?? ''}`, noindex: true })
      }
      content.value = res.data
      paging.syncAll()
    } else if (res.code === FORBIDDEN_CODE && previewToken.value) {
      previewExpired.value = true
      setPageSeo({ title: '预览链接已过期', noindex: true })
    } else if (res.code === NOT_FOUND_CODE) {
      const legacy = LEGACY_REDIRECTS[normalizedPath(router.currentRoute.value.path)]
      if (legacy && !isRedirectHop && redirectTo(legacy)) {
        redirected = true
        return
      }
      // 栏目不存在或在后台被下线：不该被搜索引擎当作有效页面收录
      notFound.value = true
      setPageSeo({ title: '页面不存在', noindex: true })
    }
  } catch {
    if (seq === loadSeq) content.value = null
  } finally {
    // 已发起跳转时保持 loading，等新路由的加载接管
    if (seq === loadSeq && !redirected) loading.value = false
  }
}

// 跟着页面标识走而不是 onMounted：栏目页路由复用本组件实例，站内切换栏目不会重新挂载
watch(target, t => void load(t), { immediate: true, deep: true })
// 同一页面带上 / 去掉预览令牌时重新取（如在预览页里点导航回到正式页）
watch(previewToken, () => void load(target.value))

// 页眉的深色头图态：只在头图真正渲染出来时才是（加载中、不存在、加载失败都是浅底）
watch(content, c => setChannelHeroReady(!!c))

// 离开页面时清掉「不存在」的 noindex 覆盖与栏目 SEO 标识，否则会残留到下一个页面
onUnmounted(() => {
  setNoReferrer(false)
  clearPageSeo()
  setChannelSeoKey(null)
  setChannelHeroReady(false)
})
</script>

<style scoped>
.cp-preview {
  /* 贴底：页眉固定在顶部，放上面会互相遮挡；贴底在长页面任何位置都看得到 */
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 60;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  color: #7a4b00;
  background: #fff4d6;
  border-top: 1px solid #f5d48a;
}
.channel-section {
  padding-top: var(--section-py);
  padding-bottom: var(--section-py);
}
/* 页头转化按钮：样式一品牌蓝圆角，样式二集团红直角；最小触控高度 44px 便于移动端点按 */
.cp-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 28px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-brand-600);
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast);
}
.cp-cta:hover { background: var(--color-brand-700); }
.cp-cta--style2 {
  background: var(--rs-primary);
  border-radius: 0;
}
.cp-cta--style2:hover { background: var(--rs-primary); filter: brightness(0.92); }
/* 筛选无结果时的「清空筛选」 */
.cp-clear {
  margin-top: 16px;
  min-height: 40px;
  padding: 0 20px;
  font-size: 14px;
  border: 1px solid var(--color-line);
  color: var(--color-ink-700);
}
.cp-clear:hover { border-color: var(--color-brand-600); color: var(--color-brand-600); }
.rs-channel-section {
  padding-top: var(--rs-section-py);
  padding-bottom: var(--rs-section-py);
}
.rs-channel-container {
  margin-left: auto;
  margin-right: auto;
  max-width: var(--rs-content-max);
  padding-left: var(--rs-content-px);
  padding-right: var(--rs-content-px);
}
</style>
