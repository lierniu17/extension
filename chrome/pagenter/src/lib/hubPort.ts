/**
 * The Hub's WebSocket port, from an OPEN_HUB message or the Hub's `?ws=` param:
 * an integer from 1 to 65535 (a number, or a string of digits). Anything else → null.
 */
export function parseHubPort(value: unknown): number | null {
	const port =
		typeof value === 'number' ? value : typeof value === 'string' && /^\d{1,5}$/.test(value) ? Number(value) : Number.NaN
	return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null
}
