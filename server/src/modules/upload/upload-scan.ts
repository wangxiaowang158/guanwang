// 上传目录扫描与引用判定 —— 素材库接口与孤儿清理脚本共用
//
// 抽成独立模块的原因：两处都要回答「磁盘上有哪些文件」「这个文件还有人用吗」，
// 判定规则各写一份必然分叉，而分叉的后果是「脚本说没人用、素材库说还在用」，
// 甚至把线上正在展示的图删掉。
import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { DataSource } from 'typeorm'
import { UPLOAD } from '../../config/app.config'

/** 磁盘上的一个上传文件 */
export interface DiskFile {
  /** 绝对路径，删除时用 */
  absPath: string
  /** 对外 URL 形式，与库里存的值比对用 */
  urlPath: string
  /** 字节数 */
  size: number
  /** 修改时间毫秒值 */
  mtimeMs: number
}

/**
 * content 表中可能出现上传地址的列
 * link 是自由文本外链列，后台可以填 /uploads/xxx.pdf 当下载直链，必须纳入
 */
const CONTENT_URL_COLUMNS = ['cover', 'video', 'whiteCover', 'file', 'link'] as const

/** site_config 表中直接存放文件地址的列 */
const SITE_URL_COLUMNS = ['logo', 'footerLogo', 'wechatQr', 'heroImage', 'heroVideo'] as const

/**
 * 递归列出上传根目录下的全部文件
 * @param rootDir 上传根目录绝对路径，用于计算相对路径
 * @param dir 当前递归到的目录，首次调用传 rootDir
 */
export async function walkUploads(rootDir: string, dir: string): Promise<DiskFile[]> {
  const files: DiskFile[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkUploads(rootDir, abs)))
      continue
    }
    if (!entry.isFile()) continue
    const info = await stat(abs)
    // 相对根目录的路径转成 URL 形式；Windows 反斜杠一并规范化
    const rel = relative(rootDir, abs).split('\\').join('/')
    files.push({
      absPath: abs,
      urlPath: `${UPLOAD.urlPrefix}/${rel}`,
      size: info.size,
      mtimeMs: info.mtimeMs,
    })
  }
  return files
}

/**
 * 收集全库所有可能含上传地址的文本，拼成一份语料
 *
 * 判定方向刻意不是「从库里提取路径再与磁盘路径比对」：
 * 那样做要求提取出的字符串与磁盘路径完全相等，而任何一种写法差异都会让
 * 引用凭空消失，进而删掉线上正在用的文件——
 *   富文本里 JSON 转义的 `\/uploads\/...`、URL 编码的 `%E4%B8%AD.jpg`、
 *   运维手工塞进卷里的中文名或带空格文件名，都会让路径提取截断或对不上前缀。
 * 改为用磁盘文件名（`<时间戳>-<hex><ext>`，全局唯一）在语料里做子串查找，
 * 上述写法差异一概绕开：无论怎么转义，文件名本身总是原样出现在文本里。
 *
 * @param ds 已初始化的数据源
 * @returns 全部候选文本拼接成的单个字符串
 */
export async function collectCorpus(ds: DataSource): Promise<string> {
  const chunks: string[] = []
  const add = (v: string | null) => {
    if (v) chunks.push(v)
  }

  // content：直接字段 + 富文本正文内嵌地址
  const contentCols = [...CONTENT_URL_COLUMNS, 'content', 'intro', 'description']
  const contents: Array<Record<string, string | null>> = await ds.query(
    `SELECT ${contentCols.join(', ')} FROM content`,
  )
  for (const row of contents) {
    for (const col of contentCols) add(row[col])
  }

  // site_config：单例表，逐列取
  const siteRows: Array<Record<string, string | null>> = await ds.query(
    `SELECT ${SITE_URL_COLUMNS.join(', ')} FROM site_config`,
  )
  for (const row of siteRows) {
    for (const col of SITE_URL_COLUMNS) add(row[col])
  }

  // 会员头像也可能指向上传目录，漏掉会误判为孤儿
  const memberRows: Array<{ avatar: string | null }> = await ds.query('SELECT avatar FROM member')
  for (const row of memberRows) add(row.avatar)

  return chunks.join('\n')
}
