// 栏目页区块底色 —— 从 ChannelPage 抽出：底色交替、深色反白、按整站色调取值
import { computed, type ComputedRef } from 'vue'
import type { PageBlock } from '@/api/page'
import type { SiteTone } from '@/stores/theme'

/** 区块实际底色：背景图 / 后台指定的底色 / 自动 */
type Tone = 'white' | 'surface' | 'dark' | 'image'

/**
 * 底色取值全部走色板变量：深色站里 canvas / surface 自动是黑 / 深灰，不必分两套写
 * dark 永远是纯黑区块；样式二沿用自己的 token 名，值已在 style.css 指向同一色板
 */
const TONE_BG: Record<'s1' | 's2', Record<Exclude<Tone, 'image'>, string>> = {
  s1: { white: 'var(--color-canvas)', surface: 'var(--color-surface)', dark: 'var(--color-navy-950)' },
  s2: { white: 'var(--rs-bg-white)', surface: 'var(--rs-bg-cream)', dark: 'var(--rs-bg-dark)' },
}

/**
 * @param blocks 当前可见区块（顺序即页面顺序）
 * @param isStyle2 当前是否样式二
 * @param siteTone 整站色调；mixed（样式三）时自动块按「白 / 黑」交替，其余按「白 / 浅灰」交替
 */
export function useBlockTones(
  blocks: ComputedRef<PageBlock[]>,
  isStyle2: () => boolean,
  siteTone: () => SiteTone = () => 'light',
) {
  /**
   * 逐块算底色：后台指定了用指定的；自动的与上一块错开
   * 按「上一块实际底色」而不是奇偶算，后台把某块设成浅色后，紧跟的自动块不会撞成同色
   * 首块恒为白：页头横幅是深色（样式三）或带图，紧跟一块白底层次最清楚
   */
  const tones = computed<Tone[]>(() => {
    const t = siteTone()
    const alt: Tone = t === 'mixed' ? 'dark' : 'surface'
    // 深色站里 white 与 dark 渲染出来都是纯黑：上一块是 dark 时视同 white，下一块错开成深灰
    const looksWhite = (x: Tone) => x === 'white' || (t === 'dark' && x === 'dark')
    const out: Tone[] = []
    blocks.value.forEach((b, i) => {
      if (b.bg) out.push('image')
      else if (b.tone) out.push(b.tone)
      else out.push(i === 0 || !looksWhite(out[i - 1]) ? 'white' : alt)
    })
    return out
  })

  /** 深色与背景图区块上文字反白；深色站里每块都是深色，交给整站色板，不必逐块反白 */
  const onDark = (i: number) => tones.value[i] === 'dark' || tones.value[i] === 'image'

  const sectionClass = (i: number) => [
    isStyle2() ? 'rs-channel-section' : 'channel-section',
    // tone-dark：区块内 text-ink-* / var(--color-line) 等语义色一并切成深色色板
    { 'is-ondark': onDark(i), 'tone-dark': onDark(i) },
  ]

  const sectionStyle = (block: PageBlock, i: number) => {
    const tone = tones.value[i]
    // 背景图地址已由后端白名单净化（不含引号、括号、空白），可直接拼进 url()
    if (tone === 'image') return { backgroundImage: `url('${block.bg}')` }
    // 区块内卡片底与区块底错开：白底配浅灰卡（组件缺省），浅灰底与黑底配 elevated 卡
    const card = tone === 'white' ? {} : { '--section-card': 'var(--color-elevated)' }
    return { background: TONE_BG[isStyle2() ? 's2' : 's1'][tone], ...card }
  }

  return { onDark, sectionClass, sectionStyle }
}
