// 图表数据格式化 —— 收敛访问统计与数据仪表盘共用的轴标签处理

/**
 * 日期轴标签：YYYY-MM-DD 压成 M/D
 * 后端统一返回完整日期（跨年时才能区分），但轴上 30 个完整日期会挤成一团，
 * 故展示层只保留月日；解析失败时原样返回，不吞掉异常值
 * @param dates 后端返回的日期数组
 */
export function toAxisDateLabels(dates: string[]): string[] {
  return dates.map((d) => {
    const parts = d.split('-')
    if (parts.length !== 3) return d
    return `${Number(parts[1])}/${Number(parts[2])}`
  })
}
