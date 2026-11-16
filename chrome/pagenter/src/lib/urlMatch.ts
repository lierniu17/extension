// TipScript URL matching: `*` matches any run of characters, `<all_urls>`
// matches any http(s) page; everything else is literal and case-insensitive.

// Characters that must be escaped to be literal inside a RegExp (the backslash
// is checked separately).
const REGEX_SPECIAL = '.+?^${}()|[]'

function escapeForRegex(ch: string) {
	if (REGEX_SPECIAL.includes(ch) || ch === String.fromCharCode(92)) {
		return String.fromCharCode(92) + ch
	}
	return ch
}

/** Whether `url` matches the TipScript `pattern` as a whole. */
export function matchUrl(pattern: string, url: string) {
	if (!pattern || !url) return false
	pattern = pattern.trim()
	if (pattern === '<all_urls>') {
		return /^https?:\/\//.test(url)
	}
	let regexStr = ''
	for (const ch of pattern) {
		if (ch === '*') {
			regexStr += '.*'
		} else {
			regexStr += escapeForRegex(ch)
		}
	}
	try {
		const re = new RegExp('^' + regexStr + '$', 'i')
		return re.test(url)
	} catch {
		return false
	}
}
