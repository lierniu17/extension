// URL normalization for Sniff: path segments that look like ids (uuid, ObjectId,
// date, number, long hex, token) become placeholders, so every request to the
// same endpoint maps to one API pattern.

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RE_OBJECT_ID = /^[0-9a-f]{24}$/i
const RE_NUMERIC = /^\d+$/
const RE_LONG_HEX = /^[0-9a-f]{20,}$/i
const RE_DATE = /^(\d{4}-\d{2}-\d{2}|\d{8})$/
const RE_BASE64URL = /^[A-Za-z0-9_-]{20,}$/

interface SegmentClass {
	isParam: boolean
	token: string
	paramKind?: 'uuid' | 'objectId' | 'date' | 'id' | 'hash' | 'token'
}

// Order matters: a date like 20240101 is also numeric, an ObjectId is also long hex.
function classifyPathSegment(seg: string): SegmentClass {
	if (!seg) return { isParam: false, token: '' }
	if (RE_UUID.test(seg)) {
		return { isParam: true, token: ':uuid', paramKind: 'uuid' }
	}
	if (RE_OBJECT_ID.test(seg)) {
		return { isParam: true, token: ':objectId', paramKind: 'objectId' }
	}
	if (RE_DATE.test(seg)) {
		return { isParam: true, token: ':date', paramKind: 'date' }
	}
	if (RE_NUMERIC.test(seg)) {
		return { isParam: true, token: ':id', paramKind: 'id' }
	}
	if (RE_LONG_HEX.test(seg)) {
		return { isParam: true, token: ':hash', paramKind: 'hash' }
	}
	// 只把同时含字母和数字的长串当 token，避免误伤普通长单词
	if (RE_BASE64URL.test(seg) && /[A-Za-z]/.test(seg) && /\d/.test(seg)) {
		return { isParam: true, token: ':token', paramKind: 'token' }
	}
	return { isParam: false, token: seg }
}

export function normalizeUrl(rawUrl: string, method: string) {
	const u = new URL(rawUrl)
	const segments = u.pathname.split('/')
	const tokens: string[] = []
	for (const seg of segments) {
		const cls = classifyPathSegment(seg)
		tokens.push(cls.token)
	}
	const urlPattern = tokens.join('/')
	const queryKeys = Array.from(new Set(u.searchParams.keys())).sort((a, b) => a.localeCompare(b))
	return {
		method: method.toUpperCase(),
		urlPattern,
		// tokens 里保留的空串是为了无损拼回 pattern，这里过滤掉仅用于展示的版本
		urlPatternTokens: tokens.filter((t) => t !== ''),
		origin: u.origin,
		queryKeys,
	}
}
