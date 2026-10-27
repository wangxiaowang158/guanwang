// 匿名表单防刷：领取表单令牌 + 蜜罐字段，口径见 server/src/modules/feedback/form-guard.ts
// 令牌在表单「出现」时领取（弹窗打开 / 板块挂载），后端据此算填写用时。
// 校验失败改了再提交时沿用同一枚：若每次提交都重领，用户改个手机号 2 秒内重提，
// 新令牌不满 3 秒会被当成脚本静默丢弃——真实线索就这么没了。成功提交后才重领
import { ref } from 'vue'
import { getFormToken } from '@/api/feedback'
import { API_SUCCESS_CODE } from '@/config'

export function useFormGuard() {
  const token = ref('')
  /** 领取时刻，用于判断令牌是否临近后端 2 小时有效期 */
  let issuedAt = 0
  /** 蜜罐：绑定到 HoneypotField，真人看不见也填不到，恒为空串 */
  const honeypot = ref('')

  /** 领取令牌；失败静默——提交时后端会提示「请刷新」，不在打开表单时就打扰用户 */
  async function refresh(): Promise<void> {
    try {
      const res = await getFormToken()
      if (res.code === API_SUCCESS_CODE && res.data?.token) {
        token.value = res.data.token
        issuedAt = Date.now()
      }
    } catch {
      token.value = ''
    }
  }

  /**
   * 没有可用令牌时才领取：弹窗误关后重开再提交，沿用原令牌，免得新令牌不满 3 秒被当成脚本。
   * 留 20 分钟余量，领了超过 100 分钟的换新，避免提交时撞上 2 小时过期
   */
  function ensure(): Promise<void> {
    if (token.value && Date.now() - issuedAt < 100 * 60 * 1000) return Promise.resolve()
    return refresh()
  }

  /** 提交时附带的防刷字段 */
  function fields(): { formToken?: string; website: string } {
    return { formToken: token.value || undefined, website: honeypot.value }
  }

  return { honeypot, refresh, ensure, fields }
}
