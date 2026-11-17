import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, Download, LoaderCircle, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import { deleteTipScript, listTipScripts, saveTipScript, updateTipScript } from '@/lib/db'
import type { NewTipScript, TipScriptRecord, TipScriptTriggerMode } from '@/lib/dbSchema'

const EMPTY_FORM: NewTipScript = {
	name: '',
	description: '',
	script: '',
	urlPatterns: ['*://*/*'],
	triggerMode: 'manual',
	enabled: true,
}

export function TipScriptSection() {
	const { t } = useI18n()
	const [items, setItems] = useState<TipScriptRecord[]>([])
	const [search, setSearch] = useState<string>('')
	const [editing, setEditing] = useState<TipScriptRecord | null>(null)
	const [creating, setCreating] = useState<boolean>(false)
	const [form, setForm] = useState<NewTipScript>(EMPTY_FORM)
	const [saving, setSaving] = useState<boolean>(false)
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
	const toggleExpanded = useCallback((id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])
	const refresh = useCallback(async () => {
		const all = await listTipScripts()
		setItems(all)
	}, [])
	useEffect(() => {
		refresh()
	}, [refresh])
	const filtered = items.filter(
		(ts) =>
			!search ||
			ts.name.toLowerCase().includes(search.toLowerCase()) ||
			ts.description.toLowerCase().includes(search.toLowerCase())
	)
	const handleCreate = () => {
		setEditing(null)
		setForm(EMPTY_FORM)
		setCreating(true)
	}
	const handleEdit = (ts: TipScriptRecord) => {
		setCreating(false)
		setEditing(ts)
		setForm({
			name: ts.name,
			description: ts.description,
			script: ts.script,
			urlPatterns: ts.urlPatterns,
			triggerMode: ts.triggerMode,
			enabled: ts.enabled,
		})
	}
	const handleCancel = () => {
		setCreating(false)
		setEditing(null)
	}
	const handleSave = async () => {
		setSaving(true)
		try {
			if (editing) {
				await updateTipScript(editing.id, form)
			} else {
				await saveTipScript(form)
			}
			setCreating(false)
			setEditing(null)
			await refresh()
		} finally {
			setSaving(false)
		}
	}
	const handleDelete = async (id: string) => {
		await deleteTipScript(id)
		if (editing?.id === id) {
			setEditing(null)
		}
		await refresh()
	}
	const handleToggle = async (ts: TipScriptRecord) => {
		await updateTipScript(ts.id, { enabled: !ts.enabled })
		await refresh()
	}
	const handleExport = () => {
		const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `tipscripts-${new Date().toISOString().slice(0, 10)}.json`
		a.click()
		URL.revokeObjectURL(url)
	}
	const handleImport = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json,.js,.ts,.txt'
		input.multiple = true
		input.onchange = async (e: Event) => {
			const files = (e.target as HTMLInputElement).files
			if (!files?.length) return
			try {
				for (const file of Array.from(files as FileList)) {
					const text = await file.text()
					if (file.name.endsWith('.json')) {
						const parsed = JSON.parse(text)
						const data = Array.isArray(parsed) ? parsed : [parsed]
						for (const ts of data) {
							await saveTipScript({
								name: ts.name || 'Imported',
								description: ts.description || '',
								script: ts.script || '',
								urlPatterns: ts.urlPatterns || ['*://*/*'],
								triggerMode: ts.triggerMode || 'manual',
								enabled: ts.enabled ?? true,
							})
						}
					} else {
						await saveTipScript({
							name: file.name.replace(/\.[^.]+$/, ''),
							description: '',
							script: text,
							urlPatterns: ['*://*/*'],
							triggerMode: 'manual',
							enabled: true,
						})
					}
				}
				await refresh()
			} catch (err) {
				console.error('[Options] Import failed:', err)
			}
		}
		input.click()
	}
	const addUrlPattern = () => {
		setForm((f) => ({ ...f, urlPatterns: [...f.urlPatterns, ''] }))
	}
	const removeUrlPattern = (idx: number) => {
		setForm((f) => ({
			...f,
			urlPatterns: f.urlPatterns.filter((_, i) => i !== idx),
		}))
	}
	const updateUrlPattern = (idx: number, value: string) => {
		setForm((f) => ({
			...f,
			urlPatterns: f.urlPatterns.map((p, i) => (i === idx ? value : p)),
		}))
	}
	if (creating || editing) {
		return (
			<div className="space-y-10">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold text-foreground">
						{editing ? t('tipScript.edit') : t('tipScript.create')}
					</h2>
					<Button variant="ghost" size="icon" onClick={handleCancel} className="cursor-pointer">
						<X className="size-5" />
					</Button>
				</div>
				<div className="rounded-xl border p-8 space-y-6">
					<div className="space-y-2">
						<label className="text-base font-semibold text-foreground">{t('tipScript.name')}</label>
						<Input
							value={form.name}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							placeholder={t('tipScript.name.placeholder')}
							className="h-10 text-base"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-base font-semibold text-foreground">
							{t('tipScript.description')}
						</label>
						<Input
							value={form.description}
							onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
							placeholder={t('tipScript.description.placeholder')}
							className="h-10 text-base"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-base font-semibold text-foreground">
							{t('tipScript.script')}
						</label>
						<textarea
							value={form.script}
							onChange={(e) => setForm((f) => ({ ...f, script: e.target.value }))}
							placeholder={t('tipScript.script.placeholder')}
							rows={12}
							className="w-full text-sm font-mono rounded-lg border border-input bg-background px-4 py-3 resize-y min-h-[200px] leading-relaxed"
							spellCheck={false}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-base font-semibold text-foreground">
							{t('tipScript.urlPatterns')}
						</label>
						<p className="text-sm text-foreground/50">{t('tipScript.urlPatterns.hint')}</p>
						{form.urlPatterns.map((pattern, idx) => (
							<div key={idx} className="flex gap-2 items-center">
								<Input
									value={pattern}
									onChange={(e) => updateUrlPattern(idx, e.target.value)}
									placeholder="*://example.com/*"
									className="h-10 text-sm font-mono"
								/>
								{form.urlPatterns.length > 1 && (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => removeUrlPattern(idx)}
										className="shrink-0 cursor-pointer"
									>
										<X className="size-4" />
									</Button>
								)}
							</div>
						))}
						<Button variant="outline" size="sm" onClick={addUrlPattern} className="cursor-pointer">
							<Plus className="size-3 mr-1" />
							{t('tipScript.addPattern')}
						</Button>
					</div>
					<div className="space-y-2">
						<label className="text-base font-semibold text-foreground">
							{t('tipScript.triggerMode')}
						</label>
						<select
							value={form.triggerMode}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									triggerMode: e.target.value as TipScriptTriggerMode,
								}))
							}
							className="w-full h-10 text-base rounded-lg border border-input bg-background px-3 cursor-pointer"
						>
							<option value="manual">{t('tipScript.triggerMode.manual')}</option>
							<option value="auto">{t('tipScript.triggerMode.auto')}</option>
						</select>
					</div>
					<label className="flex items-center justify-between cursor-pointer py-1">
						<span className="text-base text-foreground">{t('tipScript.enabled')}</span>
						<Switch
							checked={form.enabled}
							onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
						/>
					</label>
					<div className="flex gap-3 pt-3">
						<Button
							onClick={handleSave}
							disabled={saving || !form.name || !form.script}
							className="cursor-pointer h-10 px-8 text-base"
						>
							{saving ? <LoaderCircle className="size-4 animate-spin" /> : t('common.save')}
						</Button>
					</div>
				</div>
			</div>
		)
	}
	return (
		<div className="space-y-10 min-w-0 max-w-full">
			<div className="flex items-center justify-between gap-2 min-w-0">
				<h2 className="text-2xl font-bold text-foreground truncate">{t('tipScript.title')}</h2>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleImport} className="cursor-pointer">
						<Upload className="size-3.5 mr-1" />
						{t('tipScript.import')}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						disabled={items.length === 0}
						className="cursor-pointer"
					>
						<Download className="size-3.5 mr-1" />
						{t('tipScript.export')}
					</Button>
					<Button size="sm" onClick={handleCreate} className="cursor-pointer">
						<Plus className="size-3.5 mr-1" />
						{t('tipScript.create')}
					</Button>
				</div>
			</div>
			<Input
				placeholder={t('tipScript.search')}
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				className="h-10 text-base"
			/>
			{filtered.length === 0 ? (
				<div className="text-center py-12 text-sm text-muted-foreground">
					{items.length === 0 ? t('tipScript.empty') : t('tipScript.noResults')}
				</div>
			) : (
				<div className="space-y-3 min-w-0">
					{filtered.map((ts) => {
						const isExpanded = expandedIds.has(ts.id)
						return (
							<div key={ts.id} className="rounded-xl border overflow-hidden min-w-0 max-w-full">
								<div className="p-5 flex items-start gap-4 min-w-0">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 min-w-0">
											<span className="font-semibold text-base truncate">{ts.name}</span>
											<span
												className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${ts.triggerMode === 'auto' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}
											>
												{ts.triggerMode === 'auto'
													? t('tipScript.triggerMode.auto')
													: t('tipScript.triggerMode.manual')}
											</span>
										</div>
										{!isExpanded && ts.description && (
											<p className="text-sm text-foreground/60 mt-0.5 truncate">{ts.description}</p>
										)}
										{!isExpanded && (
											<div className="text-xs text-foreground/40 mt-1 font-mono truncate">
												{ts.urlPatterns.join(', ')}
											</div>
										)}
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<Switch checked={ts.enabled} onCheckedChange={() => handleToggle(ts)} />
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => handleEdit(ts)}
											className="cursor-pointer"
										>
											<Pencil className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => handleDelete(ts.id)}
											className="cursor-pointer text-destructive hover:text-destructive"
										>
											<Trash2 className="size-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => toggleExpanded(ts.id)}
											className="cursor-pointer"
											aria-expanded={isExpanded}
											aria-label={isExpanded ? 'Collapse' : 'Expand'}
										>
											<ChevronDown
												className={`size-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
											/>
										</Button>
									</div>
								</div>
								{isExpanded && (
									<div className="border-t px-5 py-4 space-y-4 bg-muted/20 min-w-0">
										{ts.description && (
											<div className="min-w-0">
												<div className="text-xs font-semibold text-foreground/50 mb-1">
													{t('tipScript.description')}
												</div>
												<p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
													{ts.description}
												</p>
											</div>
										)}
										<div className="min-w-0">
											<div className="text-xs font-semibold text-foreground/50 mb-1">
												{t('tipScript.urlPatterns')}
											</div>
											<ul className="space-y-0.5">
												{ts.urlPatterns.map((p, i) => (
													<li key={i} className="text-xs font-mono text-foreground/70 break-all">
														{p}
													</li>
												))}
											</ul>
										</div>
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
