// 冒烟脚本的报告输出 —— 各支脚本共用，避免每处都标一遍「这不是调试日志」
//
// 冒烟脚本的 stdout 就是它的产出物：跑完看的是那份逐条勾选的清单。
// 这与「提交前必须清掉的调试日志」是两回事，故集中在这里过一道，
// 由本文件承担唯一的 console 调用点

/**
 * 输出一行报告
 * @param args 与 console 同签名，便于附带失败时的诊断对象
 */
export function say(...args: unknown[]): void {
  console.info(...args) // keep：冒烟报告正文，非调试日志
}
