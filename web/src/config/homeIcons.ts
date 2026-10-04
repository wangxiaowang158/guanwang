// 首页「业务与行业」「技术服务」可选图标 —— 名称即 @element-plus/icons-vue 的导出名
// 只按需引入白名单内的图标：整包引入会把 290 多个图标全打进首页
//
// ⚠️ 名单须与 admin/src/views/Cms/homeIcons.ts 保持一致：后台下拉只给这些选项，
// 前台只认这些名称。后台多一个前台没有的，选了不显示；前台多一个，后台选不到。
import type { Component } from 'vue'
import {
  Compass, Cpu, Setting, House, DataAnalysis, Tools, Monitor, TrendCharts,
  Lightning, Sunny, Odometer, Connection, Histogram, OfficeBuilding, Service, Medal,
} from '@element-plus/icons-vue'

/** 图标名 → 组件 */
export const HOME_ICONS: Record<string, Component> = {
  Compass, Cpu, Setting, House, DataAnalysis, Tools, Monitor, TrendCharts,
  Lightning, Sunny, Odometer, Connection, Histogram, OfficeBuilding, Service, Medal,
}

/**
 * 取图标组件
 * @param name 后台选定的图标名
 * @returns 不在白名单内（未选、或名单已调整）时返回 undefined，调用方回落为序号
 */
export function homeIconOf(name?: string): Component | undefined {
  return name ? HOME_ICONS[name] : undefined
}
