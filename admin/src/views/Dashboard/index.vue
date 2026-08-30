<template>
  <PageContainer>
    <div class="dashboard">
      <a-spin :spinning="loading">
        <!-- 指标卡区 -->
        <a-row :gutter="16" class="metric-row">
          <a-col v-for="card in metricCards" :key="card.key" :span="card.span">
            <div
              class="metric-card"
              :class="{ clickable: card.onClick }"
              @click="card.onClick && card.onClick()"
            >
              <div class="metric-label">{{ card.label }}</div>
              <div class="metric-value" :style="{ color: card.color }">{{ card.value }}</div>
            </div>
          </a-col>
        </a-row>

        <!-- 访问趋势 -->
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">访问趋势</span>
            <a-radio-group v-model:value="trendRange" size="small" @change="fetchTrend">
              <a-radio-button :value="7">近 7 日</a-radio-button>
              <a-radio-button :value="30">近 30 日</a-radio-button>
            </a-radio-group>
          </div>
          <EChart v-if="trend.dates.length" :option="trendOption" height="300px" />
          <a-empty v-else description="暂无数据" style="margin: 60px 0" />
        </div>

        <!-- 最新留言概览 -->
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">最新留言概览</span>
          </div>
          <a-table
            v-if="recent.length"
            :columns="recentColumns"
            :data-source="recent"
            :pagination="false"
            row-key="id"
            size="middle"
            :custom-row="recentRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="record.status === 'unread' ? 'red' : 'green'">
                  {{ record.status === 'unread' ? '未读' : '已处理' }}
                </a-tag>
              </template>
            </template>
          </a-table>
          <a-empty v-else description="暂无数据" style="margin: 40px 0" />
        </div>
      </a-spin>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// 数据仪表盘：聚合访问量/留言/新闻案例指标（只读），点击卡片/留言跳转对应模块
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import EChart from '@/components/EChart/index.vue'
import type { EChartsOption } from 'echarts'
import {
  getDashboardMetrics, getDashboardTrend, getRecentMessages,
  type DashboardMetrics, type TrendData, type RecentMessage
} from '@/api/dashboard'

const router = useRouter()

const loading = ref(false)
const metrics = ref<DashboardMetrics | null>(null)
const trend = reactive<TrendData>({ dates: [], values: [] })
const trendRange = ref<7 | 30>(7)
const recent = ref<RecentMessage[]>([])
// 趋势请求序号，用于丢弃过期响应
let trendSeq = 0

// 跳转留言管理（带未读筛选）/ 新闻案例管理
const goMessages = (unread = false) =>
  router.push({ path: '/cms/message', query: unread ? { status: 'unread' } : {} })
const goNews = () => router.push('/cms/news-company')

// 指标卡定义（未读留言、新闻案例可点击跳转）
const metricCards = computed(() => {
  const m = metrics.value
  return [
    { key: 'total', label: '累计访问量', value: m?.totalVisits ?? 0, span: 5, color: '#2f7cff' },
    { key: 'today', label: '今日访问量', value: m?.todayVisits ?? 0, span: 5, color: '#2f7cff' },
    { key: 'msg', label: '留言总数', value: m?.messageTotal ?? 0, span: 4, color: '#262626' },
    { key: 'unread', label: '未读留言数', value: m?.messageUnread ?? 0, span: 5, color: '#fa541c', onClick: () => goMessages(true) },
    { key: 'news', label: '新闻案例数', value: m?.newsCount ?? 0, span: 5, color: '#262626', onClick: goNews }
  ]
})

const recentColumns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '提交时间', dataIndex: 'submitTime', key: 'submitTime', width: 200 },
  { title: '处理状态', key: 'status', width: 120 }
]

// 点击留言行跳转留言管理
const recentRow = (record: RecentMessage) => ({
  style: { cursor: 'pointer' },
  onClick: () => goMessages(record.status === 'unread')
})

// 趋势折线图配置
const trendOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 48, right: 24, top: 24, bottom: 32 },
  xAxis: { type: 'category', data: trend.dates, boundaryGap: false },
  yAxis: { type: 'value' },
  series: [{
    name: '访问量', type: 'line', smooth: true, data: trend.values,
    areaStyle: { opacity: 0.12 }, itemStyle: { color: '#2f7cff' }
  }]
}))

const fetchTrend = async () => {
  // 请求序号守卫：仅接受最新一次请求的结果，避免快速切换 range 时旧响应覆盖新数据
  const seq = ++trendSeq
  try {
    const res = await getDashboardTrend(trendRange.value)
    if (seq !== trendSeq) return
    if (res.data.code === 200) {
      trend.dates = res.data.data.dates
      trend.values = res.data.data.values
    }
  } catch {
    if (seq === trendSeq) message.error('数据加载失败，请刷新重试')
  }
}

const fetchAll = async () => {
  loading.value = true
  try {
    const [mRes, rRes] = await Promise.all([getDashboardMetrics(), getRecentMessages()])
    if (mRes.data.code === 200) metrics.value = mRes.data.data
    if (rRes.data.code === 200) recent.value = rRes.data.data
    await fetchTrend()
  } catch {
    message.error('数据加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
.dashboard {
  padding-bottom: 8px;
}

.metric-row {
  margin-bottom: 4px;
}

.metric-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.metric-card.clickable {
  cursor: pointer;
}

.metric-card.clickable:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.metric-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
}

.panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-top: 16px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}
</style>
