// 栏目页区块底色 —— 从 ChannelPage 抽出：底色交替、深色反白、两套模板的取值
import { computed, type ComputedRef } from 'vue'
import type { PageBlock } from '@/api/page'

/** 区块实际底色：背景图 / 后台指定的底色 / 自动 */
type Tone = 'white' | 'surface' | 'dark' | 'image'

/** 两套样式的底色取值：样式一白 / 浅灰 / 深蓝，样式二白 / 米色 / 深色 */
const TONE_BG: Record<'s1' | 's2', Record<Exclude<Tone, 'image'>, string>> = {
  s1: { white: '#fff', surface: 'var(--color-surface)', dark: 'var(--color-navy-950)' },
  s2: { white: 'var(--rs-bg-white)', surface: 'var(--rs-bg-cream)', dark: 'var(--rs-bg-dark)' },
}

/**
 * @param blocks 当前可见区块（顺序即页面顺序）
 * @param isStyle2 当前是否样式二
 */
export function useBlockTones(blocks: ComputedRef<PageBlock[]>, isStyle2: () => boolean) {
  /**
   * 逐块算底色：后台指定了用指定的；自动的与上一块错开（上一块白则浅色，否则白）
   * 按「上一块实际底色」而不是奇偶算，后台把某块设成浅色后，紧跟的自动块不会撞成同色
   */
  const tones = computed<Tone[]>(() => {
    const out: Tone[] = []
    blocks.value.forEach((b, i) => {
      if (b.bg) out.push('image')
      else if (b.tone) out.push(b.tone)
      else out.push(i === 0 || out[i - 1] !== 'white' ? 'white' : 'surface')
    })
    return out
  })

  /** 深色与背景图区块上文字反白 */
  const onDark = (i: number) => tones.value[i] === 'dark' || tones.value[i] === 'image'

  const sectionClass = (i: number) =>
    [isStyle2() ? 'rs-channel-section' : 'channel-section', { 'is-ondark': onDark(i) }]

  const sectionStyle = (block: PageBlock, i: number) => {
    const tone = tones.value[i]
    // 背景图地址已由后端白名单净化（不含引号、括号、空白），可直接拼进 url()
    if (tone === 'image') return { backgroundImage: `url('${block.bg}')` }
    return { background: TONE_BG[isStyle2() ? 's2' : 's1'][tone] }
  }

  return { onDark, sectionClass, sectionStyle }
}
