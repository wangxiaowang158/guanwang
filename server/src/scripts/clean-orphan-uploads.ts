// 上传素材孤儿清理 —— 找出上传目录里已无人引用的文件
// 换封面、删内容后旧文件仍留在磁盘上，长期运行会把盘占满，但没有任何入口能发现它们。
//
// 默认只列不删（dry-run）。确认清单无误后再加 --delete 真正删除：
//   npx ts-node -r tsconfig-paths/register src/scripts/clean-orphan-uploads.ts
//   npx ts-node -r tsconfig-paths/register src/scripts/clean-orphan-uploads.ts --delete
//
// 做成脚本而非管理端接口：删文件不可撤销，且判定依赖「扫全库引用」这一全量操作，
// 挂成接口容易被误点，也不该在请求生命周期里跑。
//
// 安全垫：
// - 只扫上传根目录下的文件，绝不碰目录外的路径
// - 近 24 小时内新建的文件一律跳过：内容可能正在编辑、图已传但表单还没保存
// - 富文本正文里的 img/video src 也计入引用，避免误删正文内嵌图
import 'reflect-metadata'
import { unlink } from 'node:fs/promises'
import { basename } from 'node:path'
import { config } from 'dotenv'
import { DataSource } from 'typeorm'
import type { DataSourceOptions } from 'typeorm'
import { buildDataSourceOptions } from '../config/database.config'
import { uploadRootDir } from '../modules/upload/upload.storage'
// 扫描与引用判定与素材库接口共用一份实现，避免两处规则分叉
import { collectCorpus, walkUploads, type DiskFile } from '../modules/upload/upload-scan'

config()

/** 新文件保护期（毫秒）：比这更新的文件不参与清理 */
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000

/**
 * 脚本输出
 * 命令行脚本的 stdout 就是它的界面，不是调试日志，故不用 console
 * @param line 输出内容，自动补换行
 */
function out(line = ''): void {
  process.stdout.write(`${line}\n`)
}

/**
 * 错误输出，走 stderr 便于与正常结果分流重定向
 * @param line 输出内容
 */
function errOut(line: string): void {
  process.stderr.write(`${line}\n`)
}

/** 字节数转可读字符串 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function main(): Promise<void> {
  const shouldDelete = process.argv.includes('--delete')
  const rootDir = uploadRootDir()

  const ds = new DataSource(buildDataSourceOptions() as DataSourceOptions)
  await ds.initialize()

  let corpus: string
  try {
    corpus = await collectCorpus(ds)
  } finally {
    await ds.destroy()
  }

  let diskFiles: DiskFile[]
  try {
    diskFiles = await walkUploads(rootDir, rootDir)
  } catch (err: unknown) {
    // 带上错误码：权限不足（EACCES）与目录不存在（ENOENT）的处置完全不同，
    // 都报「无需清理」会让运维以为扫干净了，实际是没扫到
    const code = (err as { code?: string })?.code ?? '未知错误'
    errOut(`上传目录读取失败（${code}）：${rootDir}，未执行任何清理`)
    process.exitCode = 1
    return
  }

  const now = Date.now()
  const orphans: DiskFile[] = []
  let protectedCount = 0

  let referencedCount = 0
  for (const file of diskFiles) {
    // 按文件名子串查找。宁可误判为「仍被引用」而漏删，也不能误判为孤儿而错删：
    // 短文件名（如运维手工放的 logo.png）可能撞上无关文本，那只是少回收一点空间
    if (corpus.includes(basename(file.absPath))) {
      referencedCount++
      continue
    }
    // 保护期内的新文件跳过：可能刚上传但内容还没保存
    if (now - file.mtimeMs < GRACE_PERIOD_MS) {
      protectedCount++
      continue
    }
    orphans.push(file)
  }

  const totalSize = orphans.reduce((sum, f) => sum + f.size, 0)
  out(`上传目录：${rootDir}`)
  out(`磁盘文件 ${diskFiles.length} 个，其中仍被引用 ${referencedCount} 个`)
  out(`保护期内跳过 ${protectedCount} 个（24 小时内新建）`)
  out(`无人引用 ${orphans.length} 个，合计 ${formatSize(totalSize)}`)

  if (orphans.length === 0) {
    out('无需清理。')
    return
  }

  for (const f of orphans) {
    out(`  ${shouldDelete ? '已删除' : '待删除'} ${f.urlPath}（${formatSize(f.size)}）`)
  }

  if (!shouldDelete) {
    out()
    out('以上为试运行结果，未删除任何文件。确认无误后加 --delete 执行删除。')
    return
  }

  let failed = 0
  for (const f of orphans) {
    try {
      await unlink(f.absPath)
    } catch {
      failed++
      errOut(`  删除失败：${f.urlPath}`)
    }
  }
  out()
  out(`删除完成：成功 ${orphans.length - failed} 个，失败 ${failed} 个，回收 ${formatSize(totalSize)}`)
}

main().catch((err: unknown) => {
  const reason = err instanceof Error ? err.message : String(err)
  errOut(`清理失败：${reason}`)
  process.exit(1)
})
