<template>
  <!-- 站内搜索结果页；关键词与页码都记在地址里，可分享、可后退 -->
  <!-- 顶部留白须大于固定顶栏高度（样式二 76px），本页无头图兜不住这段 -->
  <div class="bg-white">
    <div class="max-w-4xl mx-auto px-6 lg:px-8 pt-[116px] pb-16 md:pb-24">
      <h1 class="text-[28px] font-bold text-ink-900">站内搜索</h1>

      <form class="search-form mt-6" role="search" @submit.prevent="submit">
        <label for="search-q" class="sr-only">搜索关键词</label>
        <input
          id="search-q"
          ref="inputRef"
          v-model="draft"
          type="search"
          :maxlength="SEARCH_KEYWORD_MAX"
          placeholder="输入关键词，如：节能改造、能源托管"
          class="search-input"
          autocomplete="off"
        />
        <button type="submit" class="search-btn">搜索</button>
      </form>

      <!-- 结果区：aria-live 让读屏软件在结果更新时播报条数 -->
      <div class="mt-8" aria-live="polite">
        <p v-if="loading" class="text-sm text-ink-500" aria-busy="true">搜索中…</p>
        <p v-else-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
        <template v-else-if="keyword">
          <p class="text-sm text-ink-500">
            找到 <strong class="text-ink-900 tabular-nums">{{ total }}</strong> 条与「{{ keyword }}」相关的内容
          </p>
          <ul v-if="list.length" class="mt-4 divide-y divide-line">
            <li v-for="hit in list" :key="hit.id" class="py-5">
              <RouterLink :to="hit.path" class="search-hit group">
                <span class="search-tag">{{ hit.pageName }}</span>
                <!-- 高亮靠拆分文本节点而非 v-html：标题与摘要都是纯文本，拼 HTML 等于给注入开口子 -->
                <h2 class="search-title">
                  <template v-for="(seg, i) in highlight(hit.title)" :key="i"><mark v-if="seg.hit">{{ seg.text }}</mark><template v-else>{{ seg.text }}</template></template>
                </h2>
                <p v-if="hit.snippet" class="search-snippet">
                  <template v-for="(seg, i) in highlight(hit.snippet)" :key="i"><mark v-if="seg.hit">{{ seg.text }}</mark><template v-else>{{ seg.text }}</template></template>
                </p>
                <p v-if="hit.date" class="mt-1 text-xs text-ink-500 tabular-nums">{{ hit.date }}</p>
              </RouterLink>
            </li>
          </ul>
          <EmptyState v-else class="mt-8" text="没有找到相关内容，换个关键词试试" />
          <ChannelPagination
            v-if="pageCount > 1"
            class="mt-8"
            :current="page"
            :total="pageCount"
            label="搜索结果"
            :loading="loading"
            :style2="theme.isStyle2"
            @change="go"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 站内搜索：地址 ?q=关键词&page=页码 驱动，改地址即重新搜索
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchSite, SEARCH_KEYWORD_MAX, type SearchHit } from '@/api/search'
import { API_SUCCESS_CODE } from '@/config'
import { useThemeStore } from '@/stores/theme'
import ChannelPagination from '@/components/sections/ChannelPagination.vue'
import EmptyState from '@/components/sections/EmptyState.vue'

defineOptions({ name: 'SearchPage' })

const PAGE_SIZE = 10
const THROTTLED_CODE = 429

const route = useRoute()
const router = useRouter()
const theme = useThemeStore()

const inputRef = ref<HTMLInputElement>()
const draft = ref('')
const keyword = ref('')
const page = ref(1)
const list = ref<SearchHit[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const pageCount = computed(() => Math.ceil(total.value / PAGE_SIZE))

/** 从地址读关键词与页码；页码非法回落第 1 页 */
function readQuery(): { q: string; p: number } {
  const q = typeof route.query.q === 'string' ? route.query.q.trim().slice(0, SEARCH_KEYWORD_MAX) : ''
  const p = Number(route.query.page)
  return { q, p: Number.isInteger(p) && p > 0 ? p : 1 }
}

/** 请求序号：连续翻页时只认最后一次的结果，慢的旧请求回来不覆盖新结果 */
let seq = 0

async function run(): Promise<void> {
  const { q, p } = readQuery()
  draft.value = q
  keyword.value = q
  page.value = p
  error.value = ''
  // 先递增序号：清空关键词时在途的旧请求回来也不能再写状态
  const mine = ++seq
  if (!q) {
    list.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await searchSite(q, p)
    if (mine !== seq) return
    if (res.code === API_SUCCESS_CODE && res.data) {
      list.value = res.data.list
      total.value = res.data.total
    } else {
      error.value = res.code === THROTTLED_CODE ? '搜索太频繁了，请稍后再试' : '搜索失败，请稍后重试'
    }
  } catch {
    if (mine === seq) error.value = '搜索失败，请稍后重试'
  } finally {
    if (mine === seq) loading.value = false
  }
}

function submit(): void {
  const q = draft.value.trim()
  if (!q) {
    inputRef.value?.focus()
    return
  }
  void router.push({ name: 'search', query: { q } })
}

function go(p: number): void {
  void router.push({ name: 'search', query: { q: keyword.value, page: String(p) } })
  window.scrollTo({ top: 0 })
}

/** 把文本按关键词切段，命中段用 <mark> 包裹；不区分大小写 */
function highlight(text: string): Array<{ text: string; hit: boolean }> {
  const kw = keyword.value
  if (!kw) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const k = kw.toLowerCase()
  const out: Array<{ text: string; hit: boolean }> = []
  let i = 0
  while (i < text.length) {
    const at = lower.indexOf(k, i)
    if (at < 0) {
      out.push({ text: text.slice(i), hit: false })
      break
    }
    if (at > i) out.push({ text: text.slice(i, at), hit: false })
    out.push({ text: text.slice(at, at + k.length), hit: true })
    i = at + k.length
  }
  return out
}

watch(() => [route.query.q, route.query.page], () => { void run() })
onMounted(() => {
  void run()
  // 没带关键词进来（点了顶栏搜索图标）直接聚焦输入框
  if (!readQuery().q) inputRef.value?.focus()
})
</script>

<style scoped>
.search-form {
  display: flex;
  gap: 8px;
}
.search-input {
  flex: 1;
  min-width: 0;
  height: 48px;
  padding: 0 16px;
  font-size: 16px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--dur-fast) ease;
}
.search-input:focus-visible {
  border-color: var(--color-brand-600);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-600) 20%, transparent);
}
.search-btn {
  height: 48px;
  padding: 0 28px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-brand-600);
  border-radius: var(--radius-md);
}
.search-btn:hover {
  background: var(--color-brand-700);
}
.search-hit {
  display: block;
}
.search-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-brand-700);
  background: var(--color-brand-50);
  border-radius: var(--radius-sm);
}
.search-title {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-ink-900);
  transition: color var(--dur-fast) ease;
}
.search-hit:hover .search-title,
.search-hit:focus-visible .search-title {
  color: var(--color-brand-600);
}
.search-snippet {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-ink-500);
}
mark {
  color: var(--color-brand-700);
  background: transparent;
  font-weight: 600;
}
</style>
