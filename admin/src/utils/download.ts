// 文件下载工具 —— 处理二进制响应落地与「响应体其实是 JSON 错误」的判别
// 后端导出接口成功时回文件流、失败时回业务 JSON（HTTP 状态同为 200），
// 故取到 Blob 后不能直接保存，须先识别类型

/** 后端业务错误响应（导出失败时以 JSON 形式回在 Blob 里） */
interface BlobErrorPayload {
  code: number
  message?: string
}

/**
 * 判定 Blob 是否为后端回的 JSON 错误而非文件流
 * @param blob 响应体
 * @returns 是错误则返回解析后的载荷，是文件则返回 null
 */
export async function readBlobError(blob: Blob): Promise<BlobErrorPayload | null> {
  if (!blob.type.includes('application/json')) return null
  try {
    const parsed = JSON.parse(await blob.text()) as BlobErrorPayload
    return typeof parsed?.code === 'number' ? parsed : null
  } catch {
    // 声明了 JSON 却解析不出来，按未知错误处理
    return { code: -1 }
  }
}

/**
 * 从 Content-Disposition 解析文件名，优先取 RFC 5987 的 filename*（支持中文）
 * @param disposition 响应头原文，跨域未暴露该头时为空
 * @returns 解析出的文件名，取不到返回 null
 */
export function parseFileName(disposition: string | undefined): string | null {
  if (!disposition) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      // 编码异常时退回 ASCII 文件名
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain ? plain[1].trim() : null
}

/**
 * 触发浏览器下载 Blob
 * @param blob 文件内容
 * @param fileName 保存的文件名
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // 延后释放：部分浏览器在 click 同一轮事件循环内撤销会导致下载中断
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
