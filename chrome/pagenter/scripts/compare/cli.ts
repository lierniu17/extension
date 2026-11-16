// pnpm compare [--original <dir>] [--restored <dir>] [--out <dir>] [--no-probe] [--strict]
//
// Compares the original bundle with the restored build and writes
// <out>/report.json and <out>/report.md. With --strict it exits 1 unless both
// 「不同」 and 「仅一方有」 are empty and all versions agree (AC-13).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { compareFileLists, compareManifests } from '../manifest-compare.ts'
import { compareSources, type CompareResult } from './compare.ts'
import { buildVendorProbe, readOriginDir } from './probe.ts'
import { THIRD_PARTY } from './third-party.ts'
import {
	checkVersions,
	detectBundleVersions,
	listFiles,
	lockedVersions,
	readJsFiles,
	type VersionRow,
} from './versions.ts'

const projectDir = process.cwd()
const { values } = parseArgs({
	options: {
		original: { type: 'string', default: '../pagenter-ext-1.8.0-chrome' },
		restored: { type: 'string', default: '.output/chrome-mv3' },
		out: { type: 'string', default: '.output/compare' },
		'no-probe': { type: 'boolean', default: false },
		strict: { type: 'boolean', default: false },
	},
})
const originalDir = resolve(values.original)
const restoredDir = resolve(values.restored)
const outDir = resolve(values.out)

const started = Date.now()
const originalFiles = readJsFiles(originalDir)
const restoredFiles = readJsFiles(restoredDir)
const restoredOrigin = readOriginDir(join(outDir, 'decl-origin'))
if (Object.keys(restoredOrigin.origins).length === 0) {
	console.warn('warning: no decl-origin map found; run `pnpm build` so third-party code of the build can be excluded')
}

const probe = values['no-probe']
	? undefined
	: await buildVendorProbe(
			projectDir,
			join(outDir, 'probe'),
			THIRD_PARTY.flatMap((t) => t.probe ?? [])
		)

const result = await compareSources(originalFiles, restoredFiles, {
	restoredOrigins: restoredOrigin.origins,
	restoredStatementOrigins: restoredOrigin.statementOrigins,
	vendorReference: probe,
})

const versions = checkVersions(
	THIRD_PARTY,
	lockedVersions(readFileSync(join(projectDir, 'pnpm-lock.yaml'), 'utf8')),
	detectBundleVersions(THIRD_PARTY, originalFiles)
)
const readManifest = (d: string) => JSON.parse(readFileSync(join(d, 'manifest.json'), 'utf8'))
const manifestFields = compareManifests(readManifest(originalDir), readManifest(restoredDir))
const fileList = compareFileLists(listFiles(originalDir), listFiles(restoredDir))

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
	const out: Record<string, number> = {}
	for (const i of items) out[key(i)] = (out[key(i)] ?? 0) + 1
	return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]))
}

const summary = {
	same: result.same.length,
	different: result.different.length,
	onlyOriginal: result.onlyOriginal.length,
	onlyRestored: result.onlyRestored.length,
	excludedOriginal: result.excluded.filter((e) => e.side === 'original').length,
	excludedRestored: result.excluded.filter((e) => e.side === 'restored').length,
	versionMismatches: versions.filter((v) => !v.ok).length,
	manifestFieldsDiffering: manifestFields.length,
	filesOnlyOriginal: fileList.onlyOriginal.length,
	filesOnlyRestored: fileList.onlyRestored.length,
}

function markdown(r: CompareResult, v: VersionRow[]): string {
	const lines: string[] = []
	const list = (title: string, items: { name: string; file: string }[]) => {
		lines.push(`## ${title} (${items.length})`, '')
		const byFile = new Map<string, string[]>()
		for (const i of items) byFile.set(i.file, [...(byFile.get(i.file) ?? []), i.name])
		for (const [file, names] of [...byFile].sort()) lines.push(`- \`${file}\`: ${names.join(', ')}`)
		lines.push('')
	}
	lines.push(
		'# Pagenter comparison report',
		'',
		`- original: \`${originalDir}\``,
		`- restored: \`${restoredDir}\``,
		`- generated: ${new Date().toISOString()} (${((Date.now() - started) / 1000).toFixed(1)}s)`,
		'',
		'| 类别 | 条数 |',
		'| --- | --- |',
		`| 相同 | ${summary.same} |`,
		`| 不同 | ${summary.different} |`,
		`| 仅原产物有 | ${summary.onlyOriginal} |`,
		`| 仅新产物有 | ${summary.onlyRestored} |`,
		`| 排除（原产物，第三方/构建辅助） | ${summary.excludedOriginal} |`,
		`| 排除（新产物，第三方/构建辅助） | ${summary.excludedRestored} |`,
		`| manifest 不一致字段 | ${manifestFields.join(', ') || '无'} |`,
		`| 文件清单仅原产物有 | ${fileList.onlyOriginal.join(', ') || '无'} |`,
		`| 文件清单仅新产物有 | ${fileList.onlyRestored.join(', ') || '无'} |`,
		'',
		'## 第三方库版本核对',
		'',
		'| 包 | 来源 | 期望 | lockfile | 产物中读到 | 结果 |',
		'| --- | --- | --- | --- | --- | --- |',
		...v.map(
			(x) =>
				`| ${x.name} | ${x.source} | ${x.expected} | ${x.locked ?? '-'} | ${x.inBundle ?? '读不到'} | ${x.ok ? 'OK' : '不一致'} |`
		),
		'',
		'## 排除项按来源',
		'',
		...Object.entries(countBy(r.excluded, (e) => `${e.side} · ${e.origin}`)).map(
			([k, n]) => `- ${k}: ${n}`
		),
		'',
		'Build helpers excluded by name or shape (spec 风险): ' +
			[...new Set(r.excluded.filter((e) => e.origin === '(build helper)').map((e) => e.name))].join(', '),
		''
	)
	list('不同', r.different)
	list('仅原产物有', r.onlyOriginal)
	list('仅新产物有', r.onlyRestored)
	return lines.join('\n')
}

mkdirSync(outDir, { recursive: true })
writeFileSync(
	join(outDir, 'report.json'),
	JSON.stringify({ summary, manifestFields, fileList, versions, ...result }, null, '\t')
)
writeFileSync(join(outDir, 'report.md'), markdown(result, versions))
console.log(JSON.stringify(summary, null, 2))
console.log(`report: ${join(outDir, 'report.md')}`)

if (values.strict) {
	const ok =
		summary.different === 0 &&
		summary.onlyOriginal === 0 &&
		summary.onlyRestored === 0 &&
		summary.versionMismatches === 0 &&
		summary.manifestFieldsDiffering === 0 &&
		summary.filesOnlyOriginal === 0 &&
		summary.filesOnlyRestored === 0
	process.exit(ok ? 0 : 1)
}
