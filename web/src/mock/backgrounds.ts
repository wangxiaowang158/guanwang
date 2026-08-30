// 首页板块背景图 Mock —— 真实部署时由后台 Banner 配置提供图片地址
// 此处用自包含的 SVG data-URI 作为演示底图，离线可渲染，不依赖外部资源
// key 与首页板块标识对应：hero/business/philosophy/social 等

// 将 SVG 字符串编码为可用于 CSS url() 的 data-URI
function svg(content: string): string {
  return `data:image/svg+xml,${encodeURIComponent(content)}`
}

// 深蓝科技风：径向高光 + 网格，用于首屏 Hero
const techBlue = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="600" viewBox="0 0 1440 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0a2a55"/>
        <stop offset="0.55" stop-color="#0d3a72"/>
        <stop offset="1" stop-color="#072142"/>
      </linearGradient>
      <radialGradient id="r" cx="0.7" cy="0.25" r="0.6">
        <stop offset="0" stop-color="#1a7fd4" stop-opacity="0.45"/>
        <stop offset="1" stop-color="#1a7fd4" stop-opacity="0"/>
      </radialGradient>
      <pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.3" fill="#5fb0f5" fill-opacity="0.18"/>
      </pattern>
    </defs>
    <rect width="1440" height="600" fill="url(#g)"/>
    <rect width="1440" height="600" fill="url(#dots)"/>
    <rect width="1440" height="600" fill="url(#r)"/>
  </svg>`
)

// 自然绿意风：用于综合能源节能等环保主题板块
const natureGreen = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="600" viewBox="0 0 1440 600">
    <defs>
      <linearGradient id="gg" x1="0" y1="0" x2="0.8" y2="1">
        <stop offset="0" stop-color="#0f3d2e"/>
        <stop offset="0.6" stop-color="#15583f"/>
        <stop offset="1" stop-color="#0a3326"/>
      </linearGradient>
      <radialGradient id="rg" cx="0.3" cy="0.3" r="0.6">
        <stop offset="0" stop-color="#3fae7a" stop-opacity="0.4"/>
        <stop offset="1" stop-color="#3fae7a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1440" height="600" fill="url(#gg)"/>
    <rect width="1440" height="600" fill="url(#rg)"/>
  </svg>`
)

/** 首页各板块背景图配置（演示数据；真实由后台提供） */
export const homeBackgrounds: Record<string, string> = {
  hero: techBlue,
  philosophy: natureGreen
}

/** 通用栏目页 Hero 背景图（按栏目 key） */
export const pageHeroBackgrounds: Record<string, string> = {
  hvac: techBlue,
  energy: natureGreen,
  smart: techBlue
}
