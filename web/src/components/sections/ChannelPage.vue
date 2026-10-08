<template>
  <!-- 通用栏目页：头图（含当前位置）+ 各内容块；条目类区块支持分类筛选与页码翻页，按当前模板切换呈现 -->
  <div>
    <component
      :is="heroComp"
      v-if="content"
      :eyebrow="content.hero.eyebrow"
      :title="content.hero.title"
      :desc="content.hero.desc"
      :bg="content.hero.bg || fallbackImage"
      :crumb="channelName"
    />

    <!-- 加载态：头图高度占位 + 条目骨架，避免页脚先顶上来 -->
    <div v-if="loading" class="site-container py-24">
      <SkeletonRows :rows="3" />
    </div>

    <template v-else-if="content">
      <section
        v-for="(block, i) in visibleBlocks"
        :key="block.anchor"
        class="relative bg-cover bg-center"
        :class="block.bg ? 'channel-section' : sectionClass(i)"
        :style="block.bg ? { backgroundImage: `url('${block.bg}')` } : sectionStyle(i)"
      >
        <!-- 分类栏目不独立成块，但导航子菜单仍指向它的锚点：把锚点挂到被筛选区块顶部，
             点「产品类别」「行业分类」直接落到对应的筛选条上 -->
        <span v-for="alias in aliasAnchorsOf(block)" :id="alias" :key="alias" class="block h-0" aria-hidden="true"></span>
        <div v-if="block.bg" class="absolute inset-0 bg-black/55 pointer-events-none"></div>
        <div class="relative" :class="theme.isStyle2 ? 'rs-channel-container' : 'site-container'">
          <component :is="blockComp" :block="block" :on-dark="!!block.bg" :fallback-image="fallbackImage">
            <!-- 筛选条插在区块标题与条目之间（SRS：条目少于 12 条或无分类时不提供） -->
            <template #filter>
              <ChannelFilterBar
                v-if="paging.filterEnabled(block)"
                :options="filterOptionsOf(block)"
                :active="paging.state(block).category"
                :on-dark="!!block.bg"
                :loading="paging.state(block).loading"
                :style2="theme.isStyle2"
                @select="(value) => paging.setQuery(block, { category: value })"
              />
            </template>
            <template v-if="paging.state(block).category && !block.items.length" #empty>
              <EmptyState text="该分类下暂无内容" :on-dark="!!block.bg" />
            </template>
          </component>

          <p v-if="paging.state(block).failed" class="mt-6 text-center text-sm" :class="block.bg ? 'text-white' : 'text-ink-500'" role="alert">
            加载失败，请稍后重试
          </p>
          <ChannelPagination
            v-if="isPagedBlock(block) && totalPages(block) > 1"
            :current="paging.state(block).page"
            :total="totalPages(block)"
            :label="block.heading"
            :loading="paging.state(block).loading"
            :style2="theme.isStyle2"
            :on-dark="!!block.bg"
            @change="(p) => paging.setQuery(block, { page: p })"
          />
        </div>
      </section>
      <div v-if="!visibleBlocks.length" class="site-container py-24">
        <EmptyState />
      </div>
    </template>

    <!-- 栏目已下线：与网络失败区分，不给重试（重试也不会有），并禁止收录 -->
    <div v-else-if="notFound" class="site-container py-32">
      <EmptyState text="该页面不存在或已下线">
        <RouterLink to="/" class="mt-4 inline-flex items-center px-5 h-10 text-sm rounded-md border border-line text-ink-700 hover:border-brand-600 hover:text-brand-600">
          返回首页
        </RouterLink>
      </EmptyState>
    </div>

    <div v-else class="site-container py-32">
      <EmptyState text="内容加载失败，请稍后重试">
        <button type="button" class="mt-4 px-5 h-10 text-sm rounded-md border border-line text-ink-700 hover:border-brand-600 hover:text-brand-600" @click="load(pageKey)">
          重新加载
        </button>
      </EmptyState>
    </div>
  </div>
</template>

<script setup lang="ts">
// 数据驱动的栏目页容器：所有一级栏目页复用，仅传入 pageKey；分页与筛选状态见 useChannelPaging
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { clearPageSeo, setPageSeo } from '@/composables/useSeo'
import { getPageContent, getBlockItems } from '@/api/page'
import type { PageBlock, PageContent } from '@/api/page'
import { recordVisit } from '@/api/home'
import { API_SUCCESS_CODE } from '@/config'
import { useThemeStore } from '@/stores/theme'
import { useSiteStore } from '@/stores/site'
import { filterRulesOf } from '@/config/channelFilters'
import { defaultImageOf } from '@/config/defaultImages'
import { useChannelPaging, isPagedBlock, totalPages } from '@/composables/useChannelPaging'
import SkeletonRows from '@/components/common/SkeletonRows.vue'
import PageHero from './PageHero.vue'
import ContentBlock from './ContentBlock.vue'
import Style2PageHero from './Style2PageHero.vue'
import Style2ContentBlock from './Style2ContentBlock.vue'
import ChannelFilterBar from './ChannelFilterBar.vue'
import type { FilterOption } from './ChannelFilterBar.vue'
import ChannelPagination from './ChannelPagination.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps<{ pageKey: string }>()

const theme = useThemeStore()
const siteStore = useSiteStore()
// 当前位置显示栏目名（导航上的名字），而非头图主标题——主标题常是一句宣传语
const channelName = computed(() => siteStore.menu.find(m => m.key === props.pageKey)?.label || content.value?.hero.title || '')
const heroComp = computed(() => (theme.isStyle2 ? Style2PageHero : PageHero))
const blockComp = computed(() => (theme.isStyle2 ? Style2ContentBlock : ContentBlock))
/** 本栏目的缺省配图：头图未配 Banner、图文条目未配图时显示 */
const fallbackImage = computed(() => defaultImageOf(props.pageKey))

// 区块底色：样式一白/浅灰交替；样式二白/米色交替
function sectionClass(i: number) {
  if (theme.isStyle2) return 'rs-channel-section'
  return ['channel-section', i % 2 === 1 ? 'bg-surface' : 'bg-white']
}
function sectionStyle(i: number) {
  if (!theme.isStyle2) return undefined
  return { background: i % 2 === 1 ? 'var(--rs-bg-cream)' : 'var(--rs-bg-white)' }
}

const content = ref<PageContent | null>(null)
const loading = ref(true)
/** 后端返回 404：栏目不存在或已下线，与网络失败分开展示 */
const notFound = ref(false)
/** 后端「不存在」的业务码；异常统一 HTTP 200 + 响应体 code */
const NOT_FOUND_CODE = 404

/** 分类选项，按分类栏目 key 归档（取全量，首屏那一页可能不全） */
const categoryTitles = ref<Record<string, string[]>>({})

/** 分类是运营维护的少量枚举，一次取到后端单页上限即足够 */
const OPTION_FETCH_SIZE = 100

const rules = computed(() => filterRulesOf(props.pageKey))

/** 被筛选区块对应的分类名列表 */
function categoriesOf(block: PageBlock): string[] {
  const rule = rules.value.find(r => r.target === block.channelKey)
  return rule ? categoryTitles.value[rule.source] ?? [] : []
}

const paging = useChannelPaging(content, categoriesOf)

function filterOptionsOf(block: PageBlock): FilterOption[] {
  return categoriesOf(block).map(title => ({ label: title, value: title }))
}

/**
 * 参与渲染的区块
 * 充当筛选器的分类栏目不独立成块——它的条目已变成目标区块上方的筛选项
 */
const visibleBlocks = computed(() => {
  if (!content.value) return []
  const sources = new Set(rules.value.map(r => r.source))
  return content.value.blocks.filter(b => !sources.has(b.channelKey))
})

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

async function load(key: string) {
  loading.value = true
  content.value = null
  notFound.value = false
  clearPageSeo()
  categoryTitles.value = {}
  paging.reset()
  try {
    const res = await getPageContent(key)
    if (res.code === API_SUCCESS_CODE && res.data) {
      // 先拿到分类再按地址同步：地址里的分类要与可选分类比对，拿不到就判不了是否有效
      await loadCategories(res.data)
      content.value = res.data
      paging.syncAll()
    } else if (res.code === NOT_FOUND_CODE) {
      // 栏目在后台被下线：页面地址仍在，但不该被搜索引擎当作有效页面收录
      notFound.value = true
      setPageSeo({ title: '页面不存在', noindex: true })
    }
  } catch {
    content.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 访问埋点，失败静默忽略
  recordVisit(props.pageKey).catch(() => {})
})

watch(() => props.pageKey, (key) => load(key), { immediate: true })

// 离开页面时清掉「不存在」的 noindex 覆盖，否则会残留到下一个页面
onUnmounted(() => clearPageSeo())
</script>

<style scoped>
.channel-section {
  padding-top: var(--section-py);
  padding-bottom: var(--section-py);
}
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
