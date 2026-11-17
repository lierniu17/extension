import { useApiDetail } from '@/components/sniff/hooks'
import { useI18n } from '@/i18n'
import { updateApi } from '@/lib/sniff/db'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useState } from 'react'
import type { SniffBody, SniffSample } from '@/lib/dbSchema'
import type { InferredSchema } from '@/lib/sniff/schemaInfer'

export function ApiDetail({ apiId, onBack }: { apiId: string; onBack: () => void }) {
	const { t } = useI18n()
	const { api, spec, samples, loading, refresh } = useApiDetail(apiId)
	const toggleExpose = useCallback(async () => {
		if (!api) return
		await updateApi(api.id, {
			exposed: !api.exposed,
			toolName: api.toolName || buildDefaultToolName(api.method, api.urlPattern),
		})
		refresh()
	}, [api, refresh])
	if (loading || !api) {
		return <div className="p-6 text-center text-xs text-muted-foreground">Loading api...</div>
	}
	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-2 px-3 py-2 border-b sticky top-0 bg-background z-10">
				<button type="button" onClick={onBack} className="p-1 rounded hover:bg-muted" title="Back">
					<ChevronLeft className="size-4" />
				</button>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
							{api.method}
						</span>
						<span className="text-xs font-mono truncate">{api.urlPattern}</span>
					</div>
					<div className="text-[10px] text-muted-foreground">
						{t('sniff.api.samples')}
						{': '}
						{api.sampleCount}
					</div>
				</div>
			</div>
			<div className="px-3 py-2 border-b bg-muted/30 text-xs space-y-2">
				<div className="flex items-center justify-between">
					<span className="font-medium">{t('sniff.api.expose')}</span>
					<Button size="sm" variant={api.exposed ? 'default' : 'outline'} onClick={toggleExpose}>
						{api.exposed ? 'Exposed' : t('sniff.api.unexposed')}
					</Button>
				</div>
				{api.exposed && (
					<>
						<EditableField
							label={t('sniff.api.toolName')}
							value={api.toolName ?? ''}
							onSubmit={async (v) => {
								await updateApi(api.id, { toolName: v.trim() || void 0 })
								refresh()
							}}
							mono={true}
						/>
						<EditableField
							label={t('sniff.api.displayName')}
							value={api.displayName ?? ''}
							onSubmit={async (v) => {
								await updateApi(api.id, { displayName: v.trim() || void 0 })
								refresh()
							}}
						/>
						<EditableField
							label={t('sniff.api.description')}
							value={api.description ?? ''}
							onSubmit={async (v) => {
								await updateApi(api.id, { description: v.trim() || void 0 })
								refresh()
							}}
							multiline={true}
						/>
					</>
				)}
			</div>
			<SchemaBlock title={t('sniff.api.input')} schema={spec?.inputSchema ?? null} />
			<SchemaBlock title={t('sniff.api.output')} schema={spec?.outputSchema ?? null} />
			<SamplesBlock samples={samples} />
			{spec && (
				<div className="px-3 py-2 text-[10px] text-muted-foreground border-t">
					spec v{spec.version}
					{' · hash '}
					{spec.structuralHash.slice(0, 8)}
				</div>
			)}
		</div>
	)
}

function buildDefaultToolName(method: string, pattern: string) {
	const safe = pattern.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
	return `${method.toLowerCase()}_${safe}`.slice(0, 64)
}

function EditableField({ label, value, onSubmit, mono, multiline }: {
	label: string
	value: string
	onSubmit: (value: string) => Promise<void>
	mono?: boolean
	multiline?: boolean
}) {
	const [draft, setDraft] = useState(value)
	const [editing, setEditing] = useState(false)
	if (!editing && draft !== value) setDraft(value)
	const commonInputCls = `w-full px-2 py-1 border rounded bg-background ${mono ? 'font-mono' : ''}`
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[10px] text-muted-foreground">{label}</span>
			{multiline ? (
				<textarea
					value={draft}
					rows={2}
					onFocus={() => setEditing(true)}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={async () => {
						setEditing(false)
						if (draft !== value) await onSubmit(draft)
					}}
					className={commonInputCls}
				/>
			) : (
				<input
					type="text"
					value={draft}
					onFocus={() => setEditing(true)}
					onChange={(e) => setDraft(e.target.value)}
					onBlur={async () => {
						setEditing(false)
						if (draft !== value) await onSubmit(draft)
					}}
					className={`h-7 ${commonInputCls}`}
				/>
			)}
		</div>
	)
}

function SchemaBlock({ title, schema }: { title: string; schema: InferredSchema | null }) {
	const [open, setOpen] = useState(true)
	return (
		<div className="border-b">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
			>
				<ChevronRight className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`} />
				{title}
				{!schema && <span className="ml-2 text-[10px] text-muted-foreground">empty</span>}
			</button>
			{open && schema && (
				<pre className="px-3 pb-2 text-[10px] font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
					{JSON.stringify(schema, null, 2)}
				</pre>
			)}
		</div>
	)
}

function SamplesBlock({ samples }: { samples: SniffSample[] }) {
	const { t } = useI18n()
	const [open, setOpen] = useState(false)
	const [expandedId, setExpandedId] = useState<string | null>(null)
	if (samples.length === 0) {
		return (
			<div className="px-3 py-2 text-[10px] text-muted-foreground border-b">
				{t('sniff.sample.viewer.none')}
			</div>
		)
	}
	return (
		<div className="border-b">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
			>
				<ChevronRight className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`} />
				Samples ({samples.length})
			</button>
			{open && (
				<div className="text-[10px] font-mono">
					{samples.map((s) => {
						const expanded = expandedId === s.id
						return (
							<div key={s.id} className="border-t first:border-t-0">
								<button
									type="button"
									onClick={() => setExpandedId(expanded ? null : s.id)}
									className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-muted/50"
								>
									<span className={statusColor(s.resStatus)}>{s.resStatus}</span>
									<span className="flex-1 truncate">{s.url}</span>
									<span className="text-muted-foreground">
										{s.durationMs ? `${Math.round(s.durationMs)}ms` : '-'}
									</span>
								</button>
								{expanded && <SampleBody sample={s} />}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

function SampleBody({ sample }: { sample: SniffSample }) {
	const { t } = useI18n()
	const reqText = bodyText(sample.reqBody)
	const resText = bodyText(sample.resBody)
	return (
		<div className="px-3 py-2 space-y-2 bg-muted/20">
			<div>
				<div className="text-[10px] text-muted-foreground">{t('sniff.sample.viewer.req')}</div>
				<pre className="whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{reqText}</pre>
			</div>
			<div>
				<div className="text-[10px] text-muted-foreground">{t('sniff.sample.viewer.res')}</div>
				<pre className="whitespace-pre-wrap break-all max-h-40 overflow-y-auto">{resText}</pre>
			</div>
		</div>
	)
}

function bodyText(blob: SniffBody | null) {
	if (!blob) return '(empty)'
	if (blob.encoding !== 'utf8') {
		return `(${blob.encoding}, ${blob.originalSize} bytes${blob.truncated ? ', truncated' : ''})`
	}
	try {
		return JSON.stringify(JSON.parse(blob.data), null, 2)
	} catch {
		return blob.data
	}
}

function statusColor(status: number) {
	if (status >= 500) return 'text-red-600'
	if (status >= 400) return 'text-yellow-600'
	if (status >= 200 && status < 300) return 'text-green-600'
	return 'text-muted-foreground'
}
