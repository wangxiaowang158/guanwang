<template>
  <PageContainer>
    <div class="visit-stats">
      <!-- 日期范围 -->
      <div class="filter-bar">
        <a-radio-group v-model:value="range" button-style="solid" @change="onRangeChange">
          <a-radio-button :value="7">近 7 日</a-radio-button>
          <a-radio-button :value="30">近 30 日</a-radio-button>
          <a-radio-button value="custom">自定义</a-radio-button>
        </a-radio-group>
        <a-range-picker
          v-if="range === 'custom'"
          v-model:value="customRange"
          value-format="YYYY-MM-DD"
          @change="fetchData"
        />
      </div>

      <a-spin :spinning="loading">
        <!-- 关键指标 -->
        <a-row :gutter="16" class="metric-row">
          <a-col :span="12">
            <div class="metric-card">
              <div class="metric-label">总访问量</div>
              <div class="metric-value">{{ summary?.total ?? 0 }}</div>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="metric-card">
              <div class="metric-label">日均访问量</div>
              <div class="metric-value">{{ summary?.avg ?? 0 }}</div>
            </div>
          </a-col>
        </a-row>

        <!-- 访问趋势 -->
        <div class="panel">
          <div class="panel-title">访问趋势（按日）</div>
          <EChart v-if="hasData" :option="trendOption" height="300px" />
          <a-empty v-else description="暂无数据" style="margin: 60px 0" />
        </div>

        <!-- 板块关注度 -->
        <div class="panel">
          <div class="panel-title">板块关注度</div>
          <EChart v-if="hasData" :option="sectionOption" height="340px" />
          <a-empty v-else description="暂无数据" style="margin: 60px 0" />
        </div>
      </a-spin>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
// 访问统计：按日期范围聚合访问趋势与板块关注度（只读）
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import PageContainer from '@/components/PageContainer/index.vue'
import EChart from '@/components/EChart/index.vue'
import type { EChartsOption } from 'echarts'
import { getVisitSummary, type VisitSummary, type VisitQuery } from '@/api/visitStats'

const loading = ref(false)
const range = ref<7 | 30 | 'custom'>(7)
const customRange = ref<[string, string]>()
const summary = ref<VisitSummary | null>(null)

const hasData = computed(() => !!summary.value && summary.value.values.length > 0)

// 趋势折线图
const trendOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 48, right: 24, top: 24, bottom: 32 },
  xAxis: { type: 'category', data: summary.value?.dates ?? [], boundaryGap: false },
  yAxis: { type: 'value' },
  series: [{
    name: '访问量', type: 'line', smooth: true, data: summary.value?.values ?? [],
    areaStyle: { opacity: 0.12 }, itemStyle: { color: '#2f7cff' }
  }]
}))

// 板块关注度柱状图
const sectionOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 56, right: 24, top: 24, bottom: 60 },
  xAxis: {
    type: 'category',
    data: (summary.value?.sections ?? []).map(s => s.name),
    axisLabel: { interval: 0, rotate: 30 }
  },
  yAxis: { type: 'value' },
  series: [{
    name: '关注度', type: 'bar', barWidth: '50%',
    data: (summary.value?.sections ?? []).map(s => s.visits),
    itemStyle: { color: '#2f7cff', borderRadius: [4, 4, 0, 0] }
  }]
}))

// 构造查询参数：自定义范围传 startDate/endDate，预设范围传 range
const buildQuery = (): VisitQuery => {
  if (range.value === 'custom') {
    return { startDate: customRange.value![0], endDate: customRange.value![1] }
  }
  return { range: range.value }
}

const fetchData = async () => {
  // 自定义但未选日期时不请求
  if (range.value === 'custom' && !customRange.value) return
  loading.value = true
  try {
    const res = await getVisitSummary(buildQuery())
    if (res.data.code === 200) summary.value = res.data.data
  } catch {
    message.error('数据加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
}

const onRangeChange = () => {
  if (range.value !== 'custom') fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.visit-stats {
  padding-bottom: 8px;
}

.filter-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.metric-row {
  margin-bottom: 0;
}

.metric-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.metric-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
  color: #2f7cff;
}

.panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-top: 16px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
}
</style>
