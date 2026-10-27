// 上传图片加工 —— 文字水印、转 WebP，均由后台「站点工具 → 图片处理」开关，默认都关
//
// 为什么默认关：开了之后每张新图都会被重新编码，画质与体积都会变；
// 存量站点升级后不该悄悄改变上传结果。
// 为什么只处理新上传的：回头给已上传的图批量加水印不可逆，且线上引用地址不变、CDN/浏览器缓存的仍是旧图，效果不可控。
//
// 跳过加工的情形：
// - raw 上传：Logo、站点图标、二维码、分享图——加水印会污染品牌标识，二维码可能扫不出，分享卡片转 WebP 部分平台不显示
// - GIF：多半是动图，sharp 逐帧处理代价高且水印位置会抖
// - 小图（任一边 < 200px）：图标类，水印会糊成一团
import sharp from 'sharp'
import type { WatermarkPosition } from '../../common/site-ext'

export interface ImagePipelineOptions {
  watermark?: { text: string; position: WatermarkPosition }
  webp: boolean
}

/** 加工结果；processed=false 表示原样返回，调用方按原 MIME 落盘 */
export interface ImagePipelineResult {
  buffer: Buffer
  mime: string
  processed: boolean
}

/** 水印的最小图边：低于此不加 */
const MIN_EDGE_FOR_WATERMARK = 200

/** 超宽图顺带压到此宽度：后台常有人直接传相机原图（6000px），前台最宽也就 1920 的两倍 */
const MAX_WIDTH = 2560

/**
 * 输入像素上限（约 7000×7000）：sharp 默认放行到 2.68 亿像素，高压缩比 PNG 2MB 内就能逼近，
 * 解码后峰值内存可达 GB 级。超限时 sharp 抛错，由调用方按原图落盘，不进解码
 */
const SHARP_INPUT = { limitInputPixels: 50_000_000 }

/** SVG 文本转义：水印文字来自后台配置，拼进 SVG 前须转义，防止注入元素 */
function escSvg(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string)
}

/**
 * 按配置加工一张图片
 * @param input 原图缓冲（已过 MIME 白名单与文件头校验）
 * @param mime 原图 MIME
 */
export async function runImagePipeline(input: Buffer, mime: string, opts: ImagePipelineOptions): Promise<ImagePipelineResult> {
  const untouched = { buffer: input, mime, processed: false }
  if (mime === 'image/gif' || (!opts.watermark && !opts.webp)) return untouched

  const meta = await sharp(input, SHARP_INPUT).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!width || !height) return untouched

  // rotate() 无参即按 EXIF 方向摆正，随后重新编码会丢弃 EXIF（含拍摄地 GPS）
  let img = sharp(input, SHARP_INPUT).rotate()
  // EXIF 方向为 5~8 时实际宽高互换，水印尺寸要按摆正后的算
  const swapped = (meta.orientation ?? 1) >= 5
  let outW = swapped ? height : width
  let outH = swapped ? width : height
  if (outW > MAX_WIDTH) {
    outH = Math.round((outH * MAX_WIDTH) / outW)
    outW = MAX_WIDTH
    img = img.resize({ width: MAX_WIDTH })
  }

  if (opts.watermark && opts.watermark.text && Math.min(outW, outH) >= MIN_EDGE_FOR_WATERMARK) {
    img = img.composite([{ input: watermarkSvg(opts.watermark.text, opts.watermark.position, outW, outH), top: 0, left: 0 }])
  }

  if (opts.webp) return { buffer: await img.webp({ quality: 82 }).toBuffer(), mime: 'image/webp', processed: true }
  // 不转格式时按原格式重新编码；PNG 多为透明底图，保持无损
  if (mime === 'image/png') return { buffer: await img.png({ compressionLevel: 9 }).toBuffer(), mime, processed: true }
  if (mime === 'image/webp') return { buffer: await img.webp({ quality: 82 }).toBuffer(), mime, processed: true }
  return { buffer: await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), mime: 'image/jpeg', processed: true }
}

/**
 * 生成与图同尺寸的透明 SVG 水印层
 * 字号按短边的 4% 取，白字加深色描边：浅色、深色背景上都看得清
 */
function watermarkSvg(text: string, position: WatermarkPosition, w: number, h: number): Buffer {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.04))
  const pad = Math.round(size * 0.9)
  const [x, y, anchor] =
    position === 'center' ? [w / 2, h / 2, 'middle']
      : position === 'bottom-left' ? [pad, h - pad, 'start']
        : [w - pad, h - pad, 'end']
  // 字体族列出常见中文字体，服务器镜像里装的是文泉驿微米黑（见 docker/server.Dockerfile）
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
    + `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${position === 'center' ? 'middle' : 'auto'}"`
    + ` font-family="WenQuanYi Micro Hei, PingFang SC, Microsoft YaHei, sans-serif" font-size="${size}"`
    + ` fill="#ffffff" fill-opacity="0.7" stroke="#000000" stroke-opacity="0.35" stroke-width="${Math.max(1, Math.round(size / 18))}"`
    + ` paint-order="stroke">${escSvg(text)}</text></svg>`
  return Buffer.from(svg)
}
