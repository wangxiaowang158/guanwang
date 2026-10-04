// SFC 解析校验 —— 只做编译期解析，不产出构建物
// 存在意义：vue-tsc 只查类型，模板里标签未闭合、指令写错这类问题它不报，
// 而这些错误要到构建或运行时才暴露。此脚本用 Vue 官方编译器把指定 .vue
// 过一遍 parse + compileTemplate，把错误提前到静态检查阶段。
//
// 用法：node scripts/check-sfc.mjs <file.vue> [more.vue ...]
import { readFile } from 'node:fs/promises'
import { parse, compileTemplate, compileScript } from 'vue/compiler-sfc'

const files = process.argv.slice(2)
if (files.length === 0) {
  process.stderr.write('用法：node scripts/check-sfc.mjs <file.vue> [...]\n')
  process.exit(1)
}

let failed = 0

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const { descriptor, errors } = parse(source, { filename: file })

  if (errors.length > 0) {
    failed++
    process.stdout.write(`❌ ${file}\n`)
    for (const e of errors) process.stdout.write(`   解析错误：${e.message}\n`)
    continue
  }

  const problems = []

  if (descriptor.template) {
    const res = compileTemplate({
      source: descriptor.template.content,
      filename: file,
      id: file,
    })
    for (const e of res.errors) {
      problems.push(`模板：${typeof e === 'string' ? e : e.message}`)
    }
  }

  if (descriptor.script || descriptor.scriptSetup) {
    try {
      compileScript(descriptor, { id: file })
    } catch (e) {
      problems.push(`脚本：${e.message}`)
    }
  }

  if (problems.length > 0) {
    failed++
    process.stdout.write(`❌ ${file}\n`)
    for (const p of problems) process.stdout.write(`   ${p}\n`)
  } else {
    process.stdout.write(`✅ ${file}\n`)
  }
}

process.stdout.write(`\n共检查 ${files.length} 个文件，失败 ${failed} 个\n`)
if (failed > 0) process.exit(1)
