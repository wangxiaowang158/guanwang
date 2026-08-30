// 访问统计 Mock —— 按日期范围聚合访问趋势与板块关注度（只读）
// 访问量口径与 dashboard.js 一致

// 9 个前台板块（SRS 3.5.9 指定）
const SECTIONS = [
  '公司简介', '业务与行业', '主要产品', '技术支持及服务', '经营理念',
  '合作伙伴', '公司业绩', '社会贡献', '联系我们'
]

// 近 30 日按日 PV（与 dashboard trend30 同源）
const dailyPV = [
  320, 298, 415, 380, 442, 510, 488, 396, 470, 523,
  601, 558, 489, 512, 634, 678, 590, 543, 621, 705,
  662, 588, 640, 712, 689, 734, 698, 750, 781, 826
]

// 各板块关注度基准权重（近 30 日累计占比，反映访客关注分布）
const sectionWeight = [0.18, 0.14, 0.16, 0.1, 0.06, 0.08, 0.07, 0.05, 0.16]

// 生成最近 N 天的日期标签（YYYY-MM-DD 截止 2026-06-11）
function lastDays(n) {
  const arr = []
  const base = new Date('2026-06-11')
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    arr.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  return arr
}

// 计算指定天数的统计结果
function summarize(days) {
  const values = dailyPV.slice(dailyPV.length - days)
  const total = values.reduce((s, v) => s + v, 0)
  const avg = Math.round(total / days)
  // 板块关注度 = 总量 × 权重（取整）
  const sections = SECTIONS.map((name, i) => ({
    name,
    visits: Math.round(total * sectionWeight[i])
  }))
  return {
    total,
    avg,
    dates: lastDays(days),
    values,
    sections
  }
}

// PART_STATS_API
export default [
  // 访问统计聚合（range=7|30，或 startDate/endDate 自定义）
  {
    url: '/api/visit-stats/summary',
    method: 'get',
    response: ({ query }) => {
      // 自定义范围：按起止日期算天数（封顶 30 天样例）
      let days = Number(query.range) === 30 ? 30 : 7
      if (query.startDate && query.endDate) {
        const s = new Date(query.startDate)
        const e = new Date(query.endDate)
        const diff = Math.floor((e - s) / 86400000) + 1
        days = Math.min(Math.max(diff, 1), 30)
      }
      return { code: 200, message: '获取成功', data: summarize(days) }
    }
  }
]
