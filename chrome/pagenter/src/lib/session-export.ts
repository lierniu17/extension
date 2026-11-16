// TODO(types)

function timestamp() {
	return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function jsonBlock(data: any) {
	try {
		return '```json\n' + JSON.stringify(data, null, 2) + '\n```'
	} catch {
		return '```\n(non-serializable)\n```'
	}
}

function codeBlock(lang: any, code: any) {
	return '```' + lang + '\n' + code + '\n```'
}

function formatMs(ms: any) {
	if (ms < 1e3) return `${ms}ms`
	return `${(ms / 1e3).toFixed(1)}s`
}

function formatStep(event: any) {
	const lines = []
	lines.push(`## Step ${event.stepIndex}`)
	lines.push('')
	const timingParts = []
	if (event.startedAt) timingParts.push(`start: ${event.startedAt}`)
	if (event.endedAt) timingParts.push(`end: ${event.endedAt}`)
	if (event.llmDurationMs != null) timingParts.push(`LLM: ${formatMs(event.llmDurationMs)}`)
	if (event.toolDurationMs != null) timingParts.push(`tool: ${formatMs(event.toolDurationMs)}`)
	if (timingParts.length > 0) {
		lines.push(`> ${timingParts.join(' | ')}`)
		lines.push('')
	}
	const r = event.reflection
	const hasReflectionContent =
		(r.progress && r.progress.length > 0) ||
		(r.pending && r.pending.length > 0) ||
		(r.evidence && r.evidence.length > 0) ||
		!!r.reasoning ||
		(r.goal_status && r.goal_status !== 'on_track')
	if (hasReflectionContent) {
		lines.push('### Reflection')
		if (r.progress && r.progress.length > 0) {
			lines.push(`- **progress**: ${r.progress.join('; ')}`)
		}
		if (r.pending && r.pending.length > 0) {
			lines.push(`- **pending**: ${r.pending.join('; ')}`)
		}
		if (r.evidence && r.evidence.length > 0) {
			lines.push(`- **evidence**: ${r.evidence.join('; ')}`)
		}
		if (r.reasoning) lines.push(`- **reasoning**: ${r.reasoning}`)
		if (r.goal_status && r.goal_status !== 'on_track') {
			lines.push(`- **goal**: [${r.goal_status}]${r.active_goal ? ` ${r.active_goal}` : ''}`)
		}
		lines.push('')
	}
	lines.push('### Action')
	lines.push(`- **Tool**: \`${event.action.name}\``)
	const input = event.action.input
	if (input != null) {
		if (typeof input === 'object' && input.script) {
			lines.push('- **Input**:')
			lines.push(codeBlock('javascript', input.script))
		} else {
			lines.push('- **Input**: ' + jsonBlock(input))
		}
	}
	if (event.action.output) {
		const out = event.action.output
		if (out.length > 500) {
			lines.push('- **Output** (truncated):')
			lines.push('```')
			lines.push(out.slice(0, 500) + '...')
			lines.push('```')
		} else {
			lines.push(`- **Output**: \`${out}\``)
		}
	}
	lines.push('')
	if (event.usage) {
		const u = event.usage
		const parts = [
			`prompt=${u.promptTokens}`,
			`completion=${u.completionTokens}`,
			`total=${u.totalTokens}`,
		]
		if (u.cachedTokens) parts.push(`cached=${u.cachedTokens}`)
		if (u.reasoningTokens) parts.push(`reasoning=${u.reasoningTokens}`)
		lines.push(`### Usage: ${parts.join(' ')}`)
		lines.push('')
	}
	if (event.rawRequest) {
		lines.push('<details><summary>Raw Request</summary>')
		lines.push('')
		lines.push(jsonBlock(event.rawRequest))
		lines.push('')
		lines.push('</details>')
		lines.push('')
	}
	if (event.rawResponse) {
		lines.push('<details><summary>Raw Response</summary>')
		lines.push('')
		lines.push(jsonBlock(event.rawResponse))
		lines.push('')
		lines.push('</details>')
		lines.push('')
	}
	return lines.join('\n')
}

function formatEvent(event: any) {
	switch (event.type) {
		case 'step':
			return formatStep(event)
		case 'user_message':
			return `## User Message

${event.content}
`
		case 'observation':
			return `## Observation

${event.content}
`
		case 'error': {
			const errEvent = event
			const lines = [
				`## Error

\`${errEvent.message}\``,
			]
			if (errEvent.rawResponse) {
				lines.push('')
				lines.push('<details><summary>Raw Response</summary>')
				lines.push('')
				lines.push(jsonBlock(errEvent.rawResponse))
				lines.push('')
				lines.push('</details>')
			}
			return lines.join('\n') + '\n'
		}
		case 'retry':
			return `## Retry (${event.attempt}/${event.maxAttempts})

${event.message}
`
		case 'user_takeover':
			return `## User Takeover
`
		default:
			return ''
	}
}

function buildStats(history: any) {
	const stats = {
		stepCount: 0,
		totalPromptTokens: 0,
		totalCompletionTokens: 0,
		totalTokens: 0,
		toolCalls: {} as Record<string, number>,
		errorCount: 0,
		retryCount: 0,
	}
	for (const event of history) {
		if (event.type === 'step') {
			stats.stepCount++
			if (event.usage) {
				stats.totalPromptTokens += event.usage.promptTokens
				stats.totalCompletionTokens += event.usage.completionTokens
				stats.totalTokens += event.usage.totalTokens
			}
			const tool = event.action.name
			stats.toolCalls[tool] = (stats.toolCalls[tool] ?? 0) + 1
		} else if (event.type === 'error') {
			stats.errorCount++
		} else if (event.type === 'retry') {
			stats.retryCount++
		}
	}
	return stats
}

function formatStats(stats: any) {
	const lines = ['## Session Statistics', '']
	lines.push(`| Metric | Value |`)
	lines.push(`|--------|-------|`)
	lines.push(`| Steps | ${stats.stepCount} |`)
	lines.push(`| Total Tokens | ${stats.totalTokens} |`)
	lines.push(`| Prompt Tokens | ${stats.totalPromptTokens} |`)
	lines.push(`| Completion Tokens | ${stats.totalCompletionTokens} |`)
	lines.push(`| Errors | ${stats.errorCount} |`)
	lines.push(`| Retries | ${stats.retryCount} |`)
	lines.push('')
	const sorted = Object.entries(stats.toolCalls as Record<string, number>).sort((a, b) => b[1] - a[1])
	if (sorted.length > 0) {
		lines.push('### Tool Call Frequency')
		lines.push('')
		lines.push('| Tool | Count |')
		lines.push('|------|-------|')
		for (const [tool, count] of sorted) {
			lines.push(`| \`${tool}\` | ${count} |`)
		}
		lines.push('')
	}
	return lines.join('\n')
}

export function exportSessionAsMarkdown(history: any, task: any, modelInfo: any, currentScript: any) {
	const stats = buildStats(history)
	const lines = []
	lines.push('# Session Report')
	lines.push('')
	lines.push(`- **Exported**: ${timestamp()}`)
	lines.push(`- **Task**: ${task || '(none)'}`)
	lines.push(`- **Total events**: ${history.length}`)
	if (modelInfo) {
		lines.push(`- **Model**: ${modelInfo.model}`)
		lines.push(`- **Vision**: ${modelInfo.supportsVision ? 'Yes' : 'No'}`)
	}
	lines.push('')
	if (currentScript) {
		lines.push('## Current Script (latest version)')
		lines.push('')
		lines.push(codeBlock('javascript', currentScript))
		lines.push('')
	}
	lines.push(formatStats(stats))
	lines.push('---')
	lines.push('')
	for (const event of history) {
		const block = formatEvent(event)
		if (block) {
			lines.push(block)
			lines.push('---')
			lines.push('')
		}
	}
	return lines.join('\n')
}
