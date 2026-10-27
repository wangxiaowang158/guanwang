// 栏目页深色头图状态 —— 栏目页告知页眉「此刻顶部是否是深色头图」
// 通用栏目路由能匹配任意一~两段地址，地址对不上、加载中、加载失败时页面顶部是浅底；
// 页眉若只按路由名判断，会在浅底上叠白字（看不见）
import { readonly, ref } from 'vue'

const ready = ref(false)

/** 栏目页内容（含深色头图）已渲染时置 true，离开或换页时置 false */
export function setChannelHeroReady(value: boolean): void {
  ready.value = value
}

/** 页眉读取：当前栏目页顶部是否为深色头图 */
export const channelHeroReady = readonly(ready)
