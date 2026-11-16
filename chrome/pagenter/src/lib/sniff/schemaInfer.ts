// TODO(types)
// Sniff schema inference: folds observed JSON values into a JSON Schema,
// annotated with x- fields (sample count, confidence, examples, enum
// candidates, field presence). Runs in the offscreen document.

const MAX_EXAMPLES = 5
const MAX_ENUM_CANDIDATES = 20
const MAX_SAMPLE_STRING_LENGTH = 120

export type InferredSchema = Record<string, any>

function incrementSampleCount(schema: InferredSchema) {
	const prev = typeof schema['x-sample-count'] === 'number' ? schema['x-sample-count'] : 0
	schema['x-sample-count'] = prev + 1
}

function computeConfidence(sampleCount: number) {
	if (sampleCount >= 20) return 'high'
	if (sampleCount >= 5) return 'medium'
	return 'low'
}

function appendExample(schema: InferredSchema, value: any) {
	const arr = Array.isArray(schema['x-examples']) ? schema['x-examples'] : []
	let v = value
	if (typeof v === 'string' && v.length > MAX_SAMPLE_STRING_LENGTH) {
		v = v.slice(0, MAX_SAMPLE_STRING_LENGTH) + '…'
	}
	const serialized = safeStringify(v)
	if (arr.some((e: any) => safeStringify(e) === serialized)) return
	arr.push(v)
	if (arr.length > MAX_EXAMPLES) arr.shift()
	schema['x-examples'] = arr
}

function safeStringify(v: any) {
	try {
		return JSON.stringify(v)
	} catch {
		return '<circular>'
	}
}

function getJsonType(value: any) {
	if (value === null) return 'null'
	if (Array.isArray(value)) return 'array'
	const t = typeof value
	if (t === 'string') return 'string'
	if (t === 'boolean') return 'boolean'
	if (t === 'number') {
		return Number.isInteger(value) ? 'integer' : 'number'
	}
	return 'object'
}

/** Fold one observed value into the schema (`null` = nothing observed yet). */
export function mergeSample(current: InferredSchema | null, value: any): InferredSchema {
	const valueType = getJsonType(value)
	if (!current) {
		return createFreshSchema(value)
	}
	if (Array.isArray(current.anyOf)) {
		return mergeIntoAnyOf(current, value, valueType)
	}
	const currentType = schemaMainType(current)
	if (currentType === valueType || typesCompatible(currentType, valueType)) {
		return mergeIntoMonoType(current, value, valueType)
	}
	const newBranch = createFreshSchema(value)
	const prevCount = typeof current['x-sample-count'] === 'number' ? current['x-sample-count'] : 0
	const combined: InferredSchema = {
		anyOf: [current, newBranch],
		'x-sample-count': prevCount + 1,
	}
	combined['x-confidence'] = computeConfidence(combined['x-sample-count'])
	return combined
}

function schemaMainType(s: InferredSchema) {
	const t = s.type
	if (typeof t === 'string') return t
	return null
}

function typesCompatible(a: string | null, b: string) {
	if (a === null) return false
	if (a === b) return true
	if ((a === 'integer' && b === 'number') || (a === 'number' && b === 'integer')) return true
	return false
}

function createFreshSchema(value: any): InferredSchema {
	const type = getJsonType(value)
	const s: InferredSchema = { type }
	s['x-sample-count'] = 1
	s['x-confidence'] = 'low'
	if (type === 'string' || type === 'number' || type === 'integer' || type === 'boolean') {
		appendExample(s, value)
		s['x-enum-candidates'] = [value]
		if (type === 'string') {
			const len = (value as string).length
			s.minLength = len
			s.maxLength = len
		}
		if (type === 'number' || type === 'integer') {
			const n = value as number
			s.minimum = n
			s.maximum = n
		}
	}
	if (type === 'array') {
		const arr = value as any[]
		let itemsSchema: InferredSchema | null = null
		for (const el of arr) {
			itemsSchema = mergeSample(itemsSchema, el)
		}
		s.items = itemsSchema ?? {}
		s.minItems = arr.length
		s.maxItems = arr.length
	}
	if (type === 'object') {
		const obj = value as Record<string, any>
		const properties: Record<string, InferredSchema> = {}
		const required: string[] = []
		for (const [k, v] of Object.entries(obj)) {
			properties[k] = createFreshSchema(v)
			required.push(k)
		}
		s.properties = properties
		s.required = required
		s['x-object-observed'] = 1
	}
	return s
}

function mergeIntoMonoType(schema: InferredSchema, value: any, valueType: string) {
	incrementSampleCount(schema)
	schema['x-confidence'] = computeConfidence(schema['x-sample-count'])
	const currentType = schemaMainType(schema)
	if (currentType === 'integer' && valueType === 'number') {
		schema.type = 'number'
	}
	if (valueType === 'string' || valueType === 'number' || valueType === 'integer' || valueType === 'boolean') {
		mergePrimitive(schema, value, valueType)
	} else if (valueType === 'array') {
		mergeArray(schema, value)
	} else if (valueType === 'object') {
		mergeObjectFields(schema, value)
	}
	return schema
}

function mergePrimitive(schema: InferredSchema, value: any, valueType: string) {
	appendExample(schema, value)
	updateEnumCandidates(schema, value)
	if (valueType === 'string') {
		const len = (value as string).length
		const prevMin = typeof schema.minLength === 'number' ? schema.minLength : len
		const prevMax = typeof schema.maxLength === 'number' ? schema.maxLength : len
		schema.minLength = Math.min(prevMin, len)
		schema.maxLength = Math.max(prevMax, len)
	}
	if (valueType === 'number' || valueType === 'integer') {
		const n = value as number
		const prevMin = typeof schema.minimum === 'number' ? schema.minimum : n
		const prevMax = typeof schema.maximum === 'number' ? schema.maximum : n
		schema.minimum = Math.min(prevMin, n)
		schema.maximum = Math.max(prevMax, n)
	}
}

function mergeArray(schema: InferredSchema, arr: any[]) {
	let items: InferredSchema | null = schema.items ?? null
	for (const el of arr) {
		items = mergeSample(items, el)
	}
	schema.items = items ?? {}
	const prevMin = typeof schema.minItems === 'number' ? schema.minItems : arr.length
	const prevMax = typeof schema.maxItems === 'number' ? schema.maxItems : arr.length
	schema.minItems = Math.min(prevMin, arr.length)
	schema.maxItems = Math.max(prevMax, arr.length)
}

function mergeObjectFields(schema: InferredSchema, obj: Record<string, any>) {
	const properties: Record<string, InferredSchema> = schema.properties ?? {}
	const required: string[] = Array.isArray(schema.required) ? [...schema.required] : []
	const observed =
		(typeof schema['x-object-observed'] === 'number' ? schema['x-object-observed'] : 0) + 1
	schema['x-object-observed'] = observed
	const seenKeys = new Set(Object.keys(obj))
	for (const [k, v] of Object.entries(obj)) {
		const existing = properties[k]
		if (existing) {
			properties[k] = mergeSample(existing, v)
		} else {
			properties[k] = createFreshSchema(v)
			properties[k]['x-field-seen'] = 1
		}
		const rawSeen = properties[k]['x-field-seen']
		const seen = typeof rawSeen === 'number' ? rawSeen : 0
		properties[k]['x-field-seen'] = seen + 1
	}
	for (const k of Object.keys(properties)) {
		if (!seenKeys.has(k)) {
			const idx = required.indexOf(k)
			if (idx >= 0) required.splice(idx, 1)
		}
	}
	for (const [k, ps] of Object.entries(properties)) {
		const rawSeen = ps['x-field-seen']
		const seen = typeof rawSeen === 'number' ? rawSeen : 0
		const rate = observed > 0 ? seen / observed : 0
		ps['x-presence-rate'] = Math.round(rate * 1000) / 1000
		if (rate < 1) {
			const idx = required.indexOf(k)
			if (idx >= 0) required.splice(idx, 1)
		}
	}
	schema.properties = properties
	schema.required = required
}

function updateEnumCandidates(schema: InferredSchema, value: any) {
	if (typeof value === 'boolean') return
	const candidates = Array.isArray(schema['x-enum-candidates']) ? schema['x-enum-candidates'] : []
	if (schema['x-enum-candidates'] === null) return
	const serialized = safeStringify(value)
	const exists = candidates.some((c: any) => safeStringify(c) === serialized)
	if (!exists) candidates.push(value)
	if (candidates.length > MAX_ENUM_CANDIDATES) {
		schema['x-enum-candidates'] = null
		delete schema.enum
		return
	}
	schema['x-enum-candidates'] = candidates
	if (candidates.length >= 2) {
		schema.enum = [...candidates]
	}
}

function mergeIntoAnyOf(schema: InferredSchema, value: any, valueType: string) {
	incrementSampleCount(schema)
	schema['x-confidence'] = computeConfidence(schema['x-sample-count'])
	const branches: InferredSchema[] = schema.anyOf
	let matched = false
	for (let i = 0; i < branches.length; i++) {
		const b = branches[i]
		const bt = schemaMainType(b)
		if (bt === valueType || typesCompatible(bt, valueType)) {
			branches[i] = mergeSample(b, value)
			matched = true
			break
		}
	}
	if (!matched) {
		branches.push(createFreshSchema(value))
	}
	return schema
}

/** Hash of the schema without x- annotations, insensitive to key / required / enum order. */
export function structuralHash(schema: InferredSchema | null) {
	if (!schema) return 'null'
	const normalized = normalizeForHash(schema)
	const json = JSON.stringify(normalized)
	let h = 5381
	for (let i = 0; i < json.length; i++) {
		h = (h * 33 + (json.codePointAt(i) ?? 0)) >>> 0
	}
	return h.toString(16)
}

function normalizeForHash(node: any): any {
	if (node === null || typeof node !== 'object') return node
	if (Array.isArray(node)) return node.map(normalizeForHash)
	const out: Record<string, any> = {}
	const keys = Object.keys(node).sort((a, b) => a.localeCompare(b))
	for (const k of keys) {
		if (k.startsWith('x-')) continue
		const v = node[k]
		if ((k === 'required' || k === 'enum') && Array.isArray(v)) {
			const normalized = v.map((x) => (typeof x === 'object' ? normalizeForHash(x) : x))
			out[k] = [...normalized].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
			continue
		}
		out[k] = normalizeForHash(v)
	}
	return out
}
