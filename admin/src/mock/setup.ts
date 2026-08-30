// Mock 装载入口 —— 按 VITE_USE_MOCK 动态导入
// 此处直接读 import.meta.env（而非经 config 模块），使构建期能把条件折叠成字面量，
// 关闭 Mock 时 mockjs 与 mock 数据整体不会被打进产物

/**
 * 按配置装载 Mock 拦截
 * 必须在应用发起首个请求前 await，否则可能漏拦截
 */
export async function setupMock(): Promise<void> {
  if ((import.meta.env.VITE_USE_MOCK ?? 'true') !== 'true') return
  const { registerMocks } = await import('./index')
  registerMocks()
}
