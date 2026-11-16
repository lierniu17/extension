// Sniff analyzer (runs in the offscreen document): stores each sample, keeps
// the API / project counters up to date and merges the sample into the API's
// inferred input / output Schema, creating a new spec version when the
// structure changes.
import {
	countSamplesByApi,
	getApi,
	getLatestSpecByApi,
	getProject,
	putSample,
	putSpec,
	trimSamplesByApi,
	updateApi,
	updateProject,
} from '@/lib/sniff/db'
import type { SniffBody, SniffSample, SniffSpec } from '@/lib/dbSchema'
import { type InferredSchema, mergeSample, structuralHash } from '@/lib/sniff/schemaInfer'

// Samples of one API are processed strictly in order (read-modify-write of its spec).
const queues = new Map<string, Promise<void>>()

function enqueueForApi(apiId: string, task: () => Promise<void>) {
	const prev = queues.get(apiId) ?? Promise.resolve()
	const next = prev.then(task).catch((err) => {
		console.error(`[SniffAnalyzer] task failed for api ${apiId}:`, err)
	})
	queues.set(apiId, next)
	return next
}

export function ingestSample(sample: SniffSample) {
	return enqueueForApi(sample.apiId, async () => {
		await processSample(sample)
	})
}

async function processSample(sample: SniffSample) {
	await putSample(sample)
	const api = await getApi(sample.apiId)
	if (!api) {
		console.warn(`[SniffAnalyzer] api not found: ${sample.apiId}`)
		return
	}
	const newCount = api.sampleCount + 1
	await updateApi(sample.apiId, {
		sampleCount: newCount,
		lastSeenAt: sample.timestamp,
	})
	const project = await getProject(sample.projectId)
	if (project) {
		await updateProject(sample.projectId, {
			stats: {
				...project.stats,
				// 新采一条就 +1；API 数由 upsertApi 时维护，此处不动
				totalSamples: project.stats.totalSamples + 1,
				lastSampleAt: sample.timestamp,
			},
		})
	}
	await updateSpecFromSample(sample)
	// trim only every 10th sample to keep writes cheap
	if (newCount % 10 === 0 && project) {
		await trimSamplesByApi(sample.apiId, project.config.maxSamplesPerApi)
	}
}

async function updateSpecFromSample(sample: SniffSample) {
	const inputValue = decodeInput(sample)
	const outputValue = decodeBody(sample.resBody)
	if (inputValue === UNDECODABLE && outputValue === UNDECODABLE) return

	const latest = await getLatestSpecByApi(sample.apiId)
	const prevInput: InferredSchema | null = latest?.inputSchema ?? null
	const prevOutput: InferredSchema | null = latest?.outputSchema ?? null
	const nextInput = inputValue === UNDECODABLE ? prevInput : mergeSample(prevInput, inputValue)
	const nextOutput = outputValue === UNDECODABLE ? prevOutput : mergeSample(prevOutput, outputValue)

	const hashBefore = latest?.structuralHash ?? ''
	const hashAfter = combinedHash(nextInput, nextOutput)
	const structuralChanged = hashBefore !== hashAfter
	const sampleCount = await countSamplesByApi(sample.apiId)
	const confidence = confidenceByCount(sampleCount)

	if (!latest || structuralChanged) {
		const record: SniffSpec = {
			id: crypto.randomUUID(),
			apiId: sample.apiId,
			version: (latest?.version ?? 0) + 1,
			structuralHash: hashAfter,
			inputSchema: nextInput,
			outputSchema: nextOutput,
			basedOnSampleIds: [sample.id],
			confidence,
			createdAt: Date.now(),
		}
		await putSpec(record)
		await updateApi(sample.apiId, { currentSpecId: record.id })
	} else {
		const updated: SniffSpec = {
			...latest,
			inputSchema: nextInput,
			outputSchema: nextOutput,
			// 保留原有 + 追加（最多保留 50 个，防止膨胀）
			basedOnSampleIds: appendCapped(latest.basedOnSampleIds, sample.id, 50),
			confidence,
		}
		await putSpec(updated)
	}
}

function appendCapped<T>(arr: T[], v: T, cap: number) {
	const next = [...arr, v]
	return next.length > cap ? next.slice(next.length - cap) : next
}

function combinedHash(input: InferredSchema | null, output: InferredSchema | null) {
	return `${structuralHash(input)}|${structuralHash(output)}`
}

function confidenceByCount(count: number) {
	if (count < 5) return 'L1'
	if (count < 20) return 'L2'
	if (count < 50) return 'L3'
	return 'L4'
}

const UNDECODABLE = Symbol('undecodable')

/** JSON (or untyped JSON-looking) and form bodies decode to values; anything else is UNDECODABLE. */
function decodeBody(body: SniffBody | null): unknown {
	if (!body) return UNDECODABLE
	if (body.encoding === 'base64') return UNDECODABLE
	const mime = (body.mimeType ?? '').toLowerCase()
	const raw = body.data
	if (mime.includes('json') || mime === '') {
		try {
			const trimmed = raw.trim()
			if (!trimmed) return UNDECODABLE
			if (!mime && !/^[[{]/.test(trimmed)) return UNDECODABLE
			return JSON.parse(trimmed)
		} catch {
			return UNDECODABLE
		}
	}
	if (mime.includes('x-www-form-urlencoded')) {
		try {
			const params = new URLSearchParams(raw)
			const obj: Record<string, string> = {}
			for (const [k, v] of params.entries()) obj[k] = v
			return obj
		} catch {
			return UNDECODABLE
		}
	}
	return UNDECODABLE
}

/** Request input = body fields plus the query string under `__query`. */
function decodeInput(sample: SniffSample): unknown {
	let queryObj: Record<string, string> | null = null
	try {
		const u = new URL(sample.url)
		queryObj = {}
		for (const [k, v] of u.searchParams.entries()) queryObj[k] = v
	} catch {
		queryObj = null
	}
	const bodyValue = decodeBody(sample.reqBody)
	if (bodyValue === UNDECODABLE && (!queryObj || Object.keys(queryObj).length === 0)) {
		return UNDECODABLE
	}
	if (bodyValue !== UNDECODABLE && typeof bodyValue === 'object' && bodyValue !== null) {
		return {
			// body 的字段直接展开
			...bodyValue,
			// query 作为一个子对象挂在 __query 下
			...(queryObj && Object.keys(queryObj).length > 0 ? { __query: queryObj } : {}),
		}
	}
	return queryObj && Object.keys(queryObj).length > 0 ? { __query: queryObj } : UNDECODABLE
}
