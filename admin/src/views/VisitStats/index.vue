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
        <!-- 跨度限制在 90 天内且不可选未来日期：服务端统计上限即 90 天，界面不限的话所选范围与统计口径对不上 -->
        <a-range-picker
          v-if="range === 'custom'"
          v-model:value="customRange"
          value-format="YYYY-MM-DD"
          :disabled-date="disabledCustomDate"
          @calendar-change="onCalendarChange"
          @open-change="onPickerOpenChange"
          @change="fetchData"
        />
        <span v-if="range === 'custom'" class="range-tip">最长可选 90 天</span>
        <!-- 清理入口右对齐，与左侧筛选拉开距离 -->
        <a-button v-if="isSuper" danger class="clear-btn" @click="clearOpen = true">清理历史记录</a-button>
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

    <a-modal
      v-model:open="clearOpen"
      title="清理历史访问记录"
      :confirm-loading="clearing"
      ok-text="确认清理"
      :ok-button-props="{ danger: true }"
      @ok="onClear"
    >
      <a-alert
        type="warning"
        show-icon
        message="清理不可撤销"
        description="将永久删除所选日期之前的全部访问记录，已清理的日期区间不再计入统计。"
        style="margin-bottom: 16px"
      />
      <a-form :label-col="{ style: { width: '110px' } }">
        <a-form-item label="清理截止日期" required>
          <a-date-picker
            v-model:value="clearBefore"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
            :disabled-date="disabledClearDate"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </PageContainer>
</template>

<script setup lang="ts">
// 访问统计：按日期范围聚合访问趋势与板块关注度，并支持按日期清理历史记录
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import PageContainer from '@/components/PageContainer/index.vue'
import EChart from '@/components/EChart/index.vue'
import type { EChartsOption } from 'echarts'
import { getVisitSummary, clearVisitLog, type VisitSummary, type VisitQuery } from '@/api/visitStats'
import { toAxisDateLabels } from '@/utils/chart'
import { LIST_LOAD_FAILED } from '@/constants/ui'
import { useUserStore } from '@/store/modules/user'

defineOptions({ name: 'VisitStatsPage' })

// 清理入口与登录日志、操作日志同口径，仅超管可见
const { isSuper } = useUserStore()

const loading = ref(false)
const range = ref<7 | 30 | 'custom'>(7)
const customRange = ref<[string, string]>()

/** 自定义范围最大跨度（含两端），与服务端统计上限一致 */
const MAX_RANGE_DAYS = 90
/** 选择过程中已点下的第一个日期，用于限制另一端的可选范围 */
const pickingFrom = ref<Dayjs | null>(null)

/** 记下正在选择的一端：选了开始日期后，结束日期只能落在 90 天内（反之亦然） */
const onCalendarChange = (dates: [Dayjs | null, Dayjs | null] | [string, string] | null) => {
  const first = Array.isArray(dates) ? (dates[0] ?? dates[1]) : null
  pickingFrom.value = first ? dayjs(first) : null
}

/** 面板关闭时清空，下次打开不受上次选择约束 */
const onPickerOpenChange = (open: boolean) => {
  if (!open) pickingFrom.value = null
}

/** 不可选：未来日期；已选一端时，与之相距超过 90 天的日期 */
const disabledCustomDate = (current: Dayjs) => {
  if (current.isAfter(dayjs(), 'day')) return true
  const from = pickingFrom.value
  if (!from) return false
  return Math.abs(current.diff(from, 'day')) >= MAX_RANGE_DAYS
}
const summary = ref<VisitSummary | null>(null)

// 清理历史记录：弹窗开关、截止日期与提交中状态
const clearOpen = ref(false)
const clearBefore = ref<string>()
const clearing = ref(false)

/**
 * 禁用今天及以后的日期
 * 清理语义是「删除该日之前」，选今天就会把今日之前的全部访问记录删光，
 * 这几乎不会是运营的真实意图，且操作不可逆，故从选择器层面挡掉
 * @param current 待判定的日期
 */
const disabledClearDate = (current: Dayjs) => !!current && current >= dayjs().startOf('day')

const hasData = computed(() => !!summary.value && summary.value.values.length > 0)

// 趋势折线图
const trendOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 48, right: 24, top: 24, bottom: 32 },
  xAxis: {
    type: 'category',
    data: toAxisDateLabels(summary.value?.dates ?? []),
    boundaryGap: false,
  },
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
    if (res.data.code !== 200) {
      message.error(res.data.message || LIST_LOAD_FAILED)
      return
    }
    summary.value = res.data.data
  } catch {
    message.error(LIST_LOAD_FAILED)
  } finally {
    loading.value = false
  }
}

const onRangeChange = () => {
  if (range.value !== 'custom') fetchData()
}

/** 清理历史访问记录：成功后重拉当前范围的统计，图表随之回落 */
const onClear = async () => {
  if (!clearBefore.value) {
    message.warning('请选择清理截止日期')
    return
  }
  clearing.value = true
  try {
    const res = await clearVisitLog(clearBefore.value)
    if (res.data.code !== 200) {
      message.error(res.data.message || '清理失败，请稍后重试')
      return
    }
    message.success(res.data.message || '清理完成')
    clearOpen.value = false
    clearBefore.value = undefined
    await fetchData()
  } catch {
    message.error('清理失败，请稍后重试')
  } finally {
    clearing.value = false
  }
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

/* 清理按钮推到行尾，与左侧筛选区分主次 */
.range-tip {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
.clear-btn {
  margin-left: auto;
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
