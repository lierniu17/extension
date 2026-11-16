// TODO(types)
import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import type { UpstreamMcpServer } from '@/lib/dbSchema'
import {
	deleteUpstreamMcpServer,
	listUpstreamMcpServers,
	putUpstreamMcpServer,
} from '@/lib/sniff/db'

const STORAGE_KEY_LLM = 'sniffLlmConfig'

export function SniffSection({ onSettingsChanged }: any) {
	const { t } = useI18n()
	return (
		<div className="space-y-10">
			<h2 className="text-2xl font-bold text-foreground">{t('sniff.options.title')}</h2>
			<LlmOverrideCard onChanged={onSettingsChanged} />
			<UpstreamMcpCard onChanged={onSettingsChanged} />
		</div>
	)
}

function LlmOverrideCard({ onChanged }: any) {
	const { t } = useI18n()
	const [override, setOverride] = useState<any>(null)
	const [enabled, setEnabled] = useState<any>(false)
	useEffect(() => {
		chrome.storage.local.get(STORAGE_KEY_LLM).then((r) => {
			const stored = r[STORAGE_KEY_LLM]
			setOverride(stored)
			setEnabled(!!stored)
		})
	}, [])
	const toggleEnabled = (checked: any) => {
		setEnabled(checked)
		if (!checked) {
			chrome.storage.local.remove(STORAGE_KEY_LLM)
			setOverride(undefined)
			onChanged?.()
		} else if (!override) {
			setOverride({ baseURL: '', apiKey: '', model: '' })
		}
	}
	const saveField = async (patch: any) => {
		const next = override ? { ...override, ...patch } : patch
		setOverride(next)
		await chrome.storage.local.set({ [STORAGE_KEY_LLM]: next })
		onChanged?.()
	}
	return (
		<div className="rounded-xl border p-8 space-y-5">
			<label className="flex items-center justify-between p-5 rounded-lg border bg-muted/30">
				<div>
					<div className="text-base font-semibold">{t('sniff.options.llm.title')}</div>
					<div className="text-sm text-foreground/50 mt-1">{t('sniff.options.llm.desc')}</div>
				</div>
				<Switch checked={enabled} onCheckedChange={toggleEnabled} />
			</label>
			{enabled && override && (
				<div className="space-y-3">
					<LabeledInput
						label="baseURL"
						value={override.baseURL ?? ''}
						placeholder="https://api.openai.com/v1"
						onChange={(v: any) => saveField({ baseURL: v })}
					/>
					<LabeledInput
						label="apiKey"
						value={override.apiKey ?? ''}
						placeholder="sk-..."
						type="password"
						onChange={(v: any) => saveField({ apiKey: v })}
					/>
					<LabeledInput
						label="model"
						value={override.model ?? ''}
						placeholder="gpt-4o-mini"
						onChange={(v: any) => saveField({ model: v })}
					/>
				</div>
			)}
			{!enabled && (
				<div className="text-sm text-foreground/50">{t('sniff.options.llm.useMain')}</div>
			)}
		</div>
	)
}

function LabeledInput({ label, value, onChange, type = 'text', placeholder }: any) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs font-mono text-foreground/60">{label}</span>
			<input
				type={type}
				value={value}
				placeholder={placeholder}
				onChange={(e) => onChange(e.target.value)}
				className="h-9 px-3 text-sm border rounded-lg bg-background"
			/>
		</div>
	)
}

function UpstreamMcpCard({ onChanged }: any) {
	const { t } = useI18n()
	const [servers, setServers] = useState<any>([])
	const [editingId, setEditingId] = useState<any>(null)
	const refresh = useCallback(async () => {
		const rows = await listUpstreamMcpServers()
		setServers(rows)
	}, [])
	useEffect(() => {
		let cancelled = false
		void listUpstreamMcpServers().then((rows) => {
			if (!cancelled) setServers(rows)
		})
		return () => {
			cancelled = true
		}
	}, [])
	const createNew = async () => {
		const id = crypto.randomUUID()
		const now = Date.now()
		const record: UpstreamMcpServer = {
			id,
			name: `Server ${servers.length + 1}`,
			transport: 'stdio',
			command: '',
			args: [],
			allowedTools: ['*'],
			enabled: false,
			createdAt: now,
			updatedAt: now,
		}
		await putUpstreamMcpServer(record)
		setEditingId(id)
		onChanged?.()
		await refresh()
	}
	const saveServer = async (patch: any) => {
		await putUpstreamMcpServer({ ...patch, updatedAt: Date.now() })
		onChanged?.()
		await refresh()
	}
	const removeServer = async (id: any) => {
		await deleteUpstreamMcpServer(id)
		if (editingId === id) setEditingId(null)
		onChanged?.()
		await refresh()
	}
	return (
		<div className="rounded-xl border p-8 space-y-5">
			<div>
				<div className="flex items-center justify-between">
					<div className="text-base font-semibold">{t('sniff.options.mcp.title')}</div>
					<Button size="sm" onClick={createNew} className="gap-1 shrink-0">
						<Plus className="size-3.5" />
						{t('sniff.options.mcp.addBtn')}
					</Button>
				</div>
				<div className="text-sm text-foreground/50 mt-1">{t('sniff.options.mcp.desc')}</div>
			</div>
			{servers.length === 0 && (
				<div className="text-sm text-foreground/50 py-4 text-center">
					No upstream MCP servers configured.
				</div>
			)}
			<div className="space-y-2">
				{servers.map((s: any) => (
					<McpServerRow
						key={`${s.id}:${editingId === s.id ? 'edit' : 'view'}:${s.updatedAt}`}
						server={s}
						editing={editingId === s.id}
						onEditToggle={() => setEditingId(editingId === s.id ? null : s.id)}
						onSave={saveServer}
						onDelete={() => removeServer(s.id)}
					/>
				))}
			</div>
		</div>
	)
}

function McpServerRow({ server, editing, onEditToggle, onSave, onDelete }: any) {
	const { t } = useI18n()
	const [draft, setDraft] = useState<any>(server)
	const commit = async (patch: any) => {
		const next = { ...draft, ...patch }
		setDraft(next)
		await onSave(next)
	}
	return (
		<div className="rounded-lg border">
			<div className="flex items-center gap-2 px-4 py-3">
				<Switch
					checked={server.enabled}
					onCheckedChange={(checked) => commit({ enabled: checked })}
				/>
				<button
					type="button"
					onClick={onEditToggle}
					className="flex-1 text-left text-sm font-medium truncate"
				>
					{server.name}
					<span className="ml-2 text-xs font-mono text-muted-foreground">
						{server.transport === 'stdio' ? server.command || '(command?)' : server.url || '(url?)'}
					</span>
				</button>
				<button
					type="button"
					onClick={onDelete}
					title={t('sniff.options.mcp.delete')}
					className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
				>
					<Trash2 className="size-4" />
				</button>
			</div>
			{editing && (
				<div className="px-4 py-3 border-t space-y-2 bg-muted/20">
					<LabeledInput
						label={t('sniff.options.mcp.form.name')}
						value={draft.name}
						onChange={(v: any) => commit({ name: v })}
					/>
					<div className="flex flex-col gap-1">
						<span className="text-xs font-mono text-foreground/60">
							{t('sniff.options.mcp.form.transport')}
						</span>
						<select
							value={draft.transport}
							onChange={(e) =>
								commit({
									transport: e.target.value,
								})
							}
							className="h-9 px-3 text-sm border rounded-lg bg-background"
						>
							<option value="stdio">stdio (local command)</option>
							<option value="sse">sse (HTTP)</option>
						</select>
					</div>
					{draft.transport === 'stdio' ? (
						<>
							<LabeledInput
								label={t('sniff.options.mcp.form.command')}
								value={draft.command ?? ''}
								placeholder="npx"
								onChange={(v: any) => commit({ command: v })}
							/>
							<div className="flex flex-col gap-1">
								<span className="text-xs font-mono text-foreground/60">
									{t('sniff.options.mcp.form.args')}
								</span>
								<textarea
									value={(draft.args ?? []).join('\n')}
									rows={3}
									onChange={(e) =>
										setDraft({
											...draft,
											args: e.target.value
												.split('\n')
												.map((s) => s.trim())
												.filter(Boolean),
										})
									}
									onBlur={() => commit({ args: draft.args })}
									placeholder={'-y\\n@some/mcp-server'}
									className="px-3 py-2 text-sm border rounded-lg bg-background font-mono"
								/>
							</div>
						</>
					) : (
						<LabeledInput
							label={t('sniff.options.mcp.form.url')}
							value={draft.url ?? ''}
							placeholder="http://localhost:3000/sse"
							onChange={(v: any) => commit({ url: v })}
						/>
					)}
					<LabeledInput
						label={t('sniff.options.mcp.form.allowedTools')}
						value={
							Array.isArray(draft.allowedTools)
								? draft.allowedTools.join(', ')
								: (draft.allowedTools ?? '')
						}
						placeholder="* or tool1, tool2"
						onChange={(v: any) =>
							commit({
								allowedTools: v
									.split(',')
									.map((s: any) => s.trim())
									.filter(Boolean),
							})
						}
					/>
				</div>
			)}
		</div>
	)
}
