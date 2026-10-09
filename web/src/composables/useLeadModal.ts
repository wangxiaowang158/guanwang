// 线索预约弹窗的全局单例状态 —— 任何页面/组件调用 openLead(leadType) 即可唤起
// LeadFormModal 只在 DefaultLayout 挂一份，这里只持有「开不开、预选什么类型、来源是哪」
import { ref } from 'vue'
import type { LeadType } from '@/api/feedback'

// 模块级状态：全站共享同一份，不随组件实例重建
const visible = ref(false)
const leadType = ref<LeadType>('consult')
const sourceHint = ref('')

/**
 * 全局线索弹窗
 * 用法：const { openLead } = useLeadModal(); openLead('energyAssess')
 */
export function useLeadModal() {
  /**
   * 打开线索弹窗
   * @param type 预选的需求类型，缺省为在线咨询
   * @param source 来源补充说明（如「案例详情-某某项目」），会拼进提交的来源页面
   */
  function openLead(type: LeadType = 'consult', source = ''): void {
    leadType.value = type
    sourceHint.value = source
    visible.value = true
  }

  function closeLead(): void {
    visible.value = false
  }

  return { visible, leadType, sourceHint, openLead, closeLead }
}
