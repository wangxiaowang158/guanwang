// 数据仪表盘 Mock —— 聚合访问量/留言/新闻案例核心指标（只读）
// 数据口径与 visitStats.js 的访问量保持一致（同源样例）

// 近 30 日访问趋势样例（按日 PV），最后一天为"今日"
const trend30 = [
  320, 298, 415, 380, 442, 510, 488, 396, 470, 523,
  601, 558, 489, 512, 634, 678, 590, 543, 621, 705,
  662, 588, 640, 712, 689, 734, 698, 750, 781, 826
]
const TODAY_PV = trend30[trend30.length - 1]

// 生成最近 N 天的日期标签
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

// 最新留言概览（含处理状态：unread 未读 / done 已处理）
const recentMessages = [
  { id: 7008, name: '郑再福', submitTime: '2026-06-11 09:28:02', status: 'unread' },
  { id: 7007, name: '孙志成', submitTime: '2026-06-10 18:23:20', status: 'unread' },
  { id: 7006, name: '邓玉玲', submitTime: '2026-06-09 11:20:57', status: 'done' },
  { id: 7005, name: '张杰', submitTime: '2026-06-08 14:49:47', status: 'unread' },
  { id: 7004, name: '卫强', submitTime: '2026-06-07 10:14:00', status: 'done' }
]

// 累计指标（PV 累计、留言、未读、已发布新闻案例）
const metrics = {
  totalVisits: 58423,
  todayVisits: TODAY_PV,
  messageTotal: 8,
  messageUnread: 3,
  newsCount: 26
}

export default [
  // 仪表盘指标卡聚合
  {
    url: '/api/dashboard/metrics',
    method: 'get',
    response: () => ({ code: 200, message: '获取成功', data: metrics })
  },
  // 访问趋势（range=7|30，按日）
  {
    url: '/api/dashboard/trend',
    method: 'get',
    response: ({ query }) => {
      const days = Number(query.range) === 30 ? 30 : 7
      const values = trend30.slice(trend30.length - days)
      return {
        code: 200,
        message: '获取成功',
        data: { dates: lastDays(days), values }
      }
    }
  },
  // 最新留言概览
  {
    url: '/api/dashboard/recent-messages',
    method: 'get',
    response: () => ({ code: 200, message: '获取成功', data: recentMessages })
  }
]
