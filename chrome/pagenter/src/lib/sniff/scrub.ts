// TODO(types)
// Sniff scrubbing (脱敏): sensitive fields are redacted by key name, personal
// data inside strings is masked by value pattern. Applied to every sample
// (headers and bodies) before it leaves the background.

export interface ScrubRule {
	id: string
	label: string
	/** key: match the field / header name; value: match inside string values */
	scope: 'key' | 'value' | 'both'
	keyPattern?: RegExp
	valuePattern?: RegExp
	/** full: `[REDACTED:id]`; partial: keep first and last character; hash: `[REDACTED:id:hash]` */
	strategy: 'full' | 'partial' | 'hash'
	defaultEnabled?: boolean
}

export interface ScrubOptions {
	/** Only these built-in rules apply; omitted → the rules enabled by default */
	enabledRuleIds?: string[]
	customRules?: ScrubRule[]
}

export const BUILT_IN_RULES: ScrubRule[] = [
	// ---- 认证类（字段名）----
	{
		id: 'auth_key_secret',
		label: 'password/secret field',
		scope: 'key',
		// 命中字段名包含 password, passwd, pwd, secret
		keyPattern: /\b(password|passwd|pwd|secret|apikey|api[_-]?key)\b/i,
		strategy: 'full',
		defaultEnabled: true,
	},
	{
		id: 'auth_token',
		label: 'token/session field',
		scope: 'key',
		// 命中 token, sessionid, accesstoken 等
		keyPattern: /\b(token|access[_-]?token|refresh[_-]?token|session[_-]?id|jwt|bearer)\b/i,
		strategy: 'full',
		defaultEnabled: true,
	},
	{
		id: 'auth_authorization_header',
		label: 'Authorization / Cookie header',
		scope: 'key',
		keyPattern: /^(authorization|cookie|set-cookie|x-csrf-token)$/i,
		strategy: 'full',
		defaultEnabled: true,
	},
	// ---- 身份类（值正则）----
	{
		id: 'email',
		label: 'email address',
		scope: 'value',
		// 基础 email 正则（不追求 RFC 完备）
		valuePattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
		strategy: 'partial',
		defaultEnabled: true,
	},
	{
		id: 'cn_phone',
		label: 'CN mobile phone',
		scope: 'value',
		// 中国大陆手机号：1 开头 11 位
		valuePattern: /(?<!\d)(1[3-9]\d{9})(?!\d)/g,
		strategy: 'partial',
		defaultEnabled: true,
	},
	{
		id: 'cn_id_card',
		label: 'CN ID card 18',
		scope: 'value',
		// 18 位身份证（不校验效验位，只要格式）
		valuePattern: /(?<!\d)(\d{17}[\dXx])(?![\dXx])/g,
		strategy: 'partial',
		defaultEnabled: true,
	},
	{
		id: 'bank_card',
		label: 'bank card 13-19',
		scope: 'value',
		// 13~19 位连续数字（银行卡范围），需独立成段避免误伤
		valuePattern: /(?<!\d)(\d{13,19})(?!\d)/g,
		strategy: 'partial',
		defaultEnabled: true,
	},
	// ---- 地址/IP 类 ----
	{
		id: 'ipv4',
		label: 'IPv4 address',
		scope: 'value',
		valuePattern: /(?<![\d.])((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?![\d.])/g,
		strategy: 'partial',
		defaultEnabled: false,
	},
]

/** Scrub any JSON-like value (objects and arrays recursively). */
export function scrubValue(value: any, options: ScrubOptions = {}): any {
	const rules = resolveRules(options)
	return recurse(value, null, rules)
}

/** Scrub an HTTP header map: key rules redact the whole value, value rules mask inside it. */
export function scrubHeaders(headers: Record<string, string>, options: ScrubOptions = {}) {
	const rules = resolveRules(options)
	const out: Record<string, string> = {}
	for (const [k, v] of Object.entries(headers)) {
		const keyHit = rules.find(
			(r) => (r.scope === 'key' || r.scope === 'both') && r.keyPattern?.test(k)
		)
		if (keyHit) {
			out[k] = applyFullReplace(v, keyHit)
			continue
		}
		out[k] = applyValueRules(v, rules)
	}
	return out
}

function resolveRules(options: ScrubOptions) {
	const enabledIds = options.enabledRuleIds
	const base = enabledIds
		? BUILT_IN_RULES.filter((r) => enabledIds.includes(r.id))
		: BUILT_IN_RULES.filter((r) => r.defaultEnabled)
	const custom = options.customRules ?? []
	return [...base, ...custom]
}

function recurse(value: any, currentKey: string | null, rules: ScrubRule[]): any {
	if (value === null || value === undefined) return value
	if (typeof value === 'object' && !Array.isArray(value)) {
		const out: Record<string, any> = {}
		for (const [k, v] of Object.entries(value)) {
			const keyHit = rules.find(
				(r) => (r.scope === 'key' || r.scope === 'both') && r.keyPattern?.test(k)
			)
			if (keyHit) {
				out[k] = redactBySchema(v, keyHit)
				continue
			}
			out[k] = recurse(v, k, rules)
		}
		return out
	}
	if (Array.isArray(value)) {
		return value.map((el) => recurse(el, currentKey, rules))
	}
	if (typeof value === 'string') {
		return applyValueRules(value, rules)
	}
	return value
}

/** Keep the shape (objects / arrays) under a sensitive key, redact every leaf. */
function redactBySchema(value: any, rule: ScrubRule): any {
	if (value === null || value === undefined) return value
	if (Array.isArray(value)) return value.map((v) => redactBySchema(v, rule))
	if (typeof value === 'object') {
		const out: Record<string, any> = {}
		for (const [k, v] of Object.entries(value)) {
			out[k] = redactBySchema(v, rule)
		}
		return out
	}
	return applyFullReplace(value, rule)
}

function applyFullReplace(value: any, rule: ScrubRule) {
	if (rule.strategy === 'hash') {
		return `[REDACTED:${rule.id}:${shortHash(toDebugString(value))}]`
	}
	return `[REDACTED:${rule.id}]`
}

function toDebugString(v: any): string {
	if (v === null) return 'null'
	if (v === undefined) return 'undefined'
	if (typeof v === 'object') return JSON.stringify(v)
	if (typeof v === 'string') return v
	return v.toString()
}

function applyValueRules(value: string, rules: ScrubRule[]) {
	let out = value
	for (const rule of rules) {
		if (rule.scope !== 'value' && rule.scope !== 'both') continue
		if (!rule.valuePattern) continue
		// 每次新建，避免共享 RegExp 的 lastIndex
		const pattern = new RegExp(rule.valuePattern.source, rule.valuePattern.flags)
		out = out.replace(pattern, (match) => {
			if (rule.strategy === 'hash') {
				return `[REDACTED:${rule.id}:${shortHash(match)}]`
			}
			if (rule.strategy === 'partial') {
				return partialMask(match)
			}
			return `[REDACTED:${rule.id}]`
		})
	}
	return out
}

/** Keep the first and last character: `13812345678` → `1*********8`. */
function partialMask(s: string) {
	if (s.length <= 2) return '*'.repeat(s.length)
	const first = s[0]
	const last = s.at(-1) ?? ''
	return `${first}${'*'.repeat(s.length - 2)}${last}`
}

/** djb2, hex, at most 8 characters. */
function shortHash(s: string) {
	let h = 5381
	for (let i = 0; i < s.length; i++) {
		h = (h * 33 + (s.codePointAt(i) ?? 0)) >>> 0
	}
	return h.toString(16).slice(0, 8)
}
