// 种子素材 —— 从框架图第三版裁出的信息图、架构图、案例照片
// 随代码仓库分发（server/seed-assets/v3），种子执行时复制到上传目录 seed/v3/ 下，
// 前台按 /uploads/seed/v3/<文件名> 访问；之后运营在后台换图即走正常上传，与这里无关
import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { UPLOAD } from '../../config/app.config'
import { uploadRootDir } from '../../modules/upload/upload.storage'

/** 素材源目录：相对进程工作目录（本地为 server/，容器内为 /app） */
const SOURCE_DIR = join(process.cwd(), 'seed-assets', 'v3')

/** 上传目录下的子路径 */
const TARGET_SUB = join('seed', 'v3')

/** 素材清单中的一项 */
export interface SeedAsset {
  file: string
  w?: number
  h?: number
  title?: string
  desc?: string
}

/** 素材清单：页面代号 → 区块代号 → 素材列表 */
export type SeedManifest = Record<string, Record<string, SeedAsset[]>>

/** 素材对外地址 */
export function seedAssetUrl(file: string): string {
  return `${UPLOAD.urlPrefix}/seed/v3/${file}`
}

/**
 * 读取素材清单；目录或清单不存在时返回空清单（内容照常写入，只是不带图）
 */
export async function loadSeedManifest(): Promise<SeedManifest> {
  try {
    const raw = await readFile(join(SOURCE_DIR, 'manifest.json'), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as SeedManifest) : {}
  } catch {
    return {}
  }
}

/**
 * 把素材复制进上传目录；目标已存在的同名文件跳过（不覆盖运营可能替换过的文件）
 * @returns 本次新复制的文件数
 */
export async function copySeedAssets(): Promise<number> {
  let files: string[]
  try {
    files = (await readdir(SOURCE_DIR)).filter(f => /\.(?:jpe?g|png|webp)$/i.test(f))
  } catch {
    return 0
  }
  const target = join(uploadRootDir(), TARGET_SUB)
  await mkdir(target, { recursive: true })
  let copied = 0
  for (const f of files) {
    const dest = join(target, f)
    const exists = await stat(dest).then(() => true, () => false)
    if (exists) continue
    await copyFile(join(SOURCE_DIR, f), dest)
    copied += 1
  }
  return copied
}
