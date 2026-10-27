// 搜索结果显示宽度的近似计算 —— 中文与全角符号按 2、其余按 1 计
// 百度 PC 端标题约显示 30 个汉字、摘要约 80 个汉字；各家规则不公开且会变，这里只求「大致会不会被截」

/** 标题可显示宽度（约 30 个汉字） */
export const SERP_TITLE_WIDTH = 60
/** 摘要可显示宽度（约 80 个汉字，两行） */
export const SERP_DESC_WIDTH = 160

/** 单个字符的显示宽度：CJK、全角标点、表情按 2 */
function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 0
  return code > 0x2e7f ? 2 : 1
}

/** 整段文字的显示宽度 */
export function textWidth(text: string): number {
  let w = 0
  for (const ch of text) w += charWidth(ch)
  return w
}

/**
 * 按显示宽度截断
 * @returns text 截断后的文字；cut 是否发生了截断
 */
export function fitByWidth(text: string, max: number): { text: string; cut: boolean } {
  let w = 0
  let out = ''
  for (const ch of text) {
    const cw = charWidth(ch)
    if (w + cw > max) return { text: out, cut: true }
    w += cw
    out += ch
  }
  return { text: out, cut: false }
}
