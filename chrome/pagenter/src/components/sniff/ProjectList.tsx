// TODO(types)
import { useProjectList } from '@/components/sniff/hooks'
import { useI18n } from '@/i18n'
import { createProject, deleteProject } from '@/lib/sniff/db'
import { Button } from '@/components/ui/button'
import { CirclePlay, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function ProjectList({ onSelect }: any) {
	const { t } = useI18n()
	const { projects, loading, refresh } = useProjectList()
	const [creating, setCreating] = useState<any>(null)
	const openCreateForm = async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		let origin = ''
		try {
			if (tab?.url) origin = new URL(tab.url).origin
		} catch {
			origin = ''
		}
		const name = origin ? new URL(origin).hostname : ''
		setCreating({ name, origin })
	}
	const submitCreate = async () => {
		if (!creating) return
		const name = creating.name.trim()
		const origin = creating.origin.trim()
		if (!name) return
		await createProject({
			name,
			// originPatterns 用字符串数组，至少给一个默认的
			originPatterns: origin ? [origin] : [],
		})
		setCreating(null)
		refresh()
	}
	const handleDelete = async (p: any) => {
		if (!confirm(t('sniff.project.delete.confirm'))) return
		await deleteProject(p.id)
		refresh()
	}
	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between px-3 py-2 border-b">
				<div className="text-xs font-medium text-muted-foreground">
					{projects.length > 0 && `${projects.length} projects`}
				</div>
				<Button size="sm" onClick={openCreateForm} className="gap-1">
					<Plus className="size-3.5" />
					{t('sniff.btn.newProject')}
				</Button>
			</div>
			{creating && (
				<div className="flex flex-col gap-2 px-3 py-2 border-b bg-muted/30">
					<input
						autoFocus={true}
						value={creating.name}
						onChange={(e) => setCreating({ ...creating, name: e.target.value })}
						placeholder="Project name"
						className="h-8 px-2 text-sm border rounded bg-background"
					/>
					<input
						value={creating.origin}
						onChange={(e) => setCreating({ ...creating, origin: e.target.value })}
						placeholder="https://example.com"
						className="h-8 px-2 text-sm border rounded bg-background"
					/>
					<div className="flex gap-2 justify-end">
						<Button size="sm" variant="ghost" onClick={() => setCreating(null)}>
							Cancel
						</Button>
						<Button size="sm" onClick={submitCreate} disabled={!creating.name.trim()}>
							Create
						</Button>
					</div>
				</div>
			)}
			<div className="flex-1 overflow-y-auto">
				{loading && <div className="p-6 text-center text-xs text-muted-foreground">Loading...</div>}
				{!loading && projects.length === 0 && !creating && (
					<div className="p-6 text-center">
						<div className="text-sm font-medium">{t('sniff.empty.title')}</div>
						<div className="mt-1 text-xs text-muted-foreground">{t('sniff.empty.desc')}</div>
					</div>
				)}
				{projects.map((p: any) => (
					<ProjectRow
						key={p.id}
						project={p}
						onSelect={() => onSelect(p.id)}
						onDelete={() => handleDelete(p)}
					/>
				))}
			</div>
		</div>
	)
}

function ProjectRow({ project, onSelect, onDelete }: any) {
	const { t } = useI18n()
	const dotClass = project.status === 'recording' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
	const statusLabel = t(`sniff.project.status.${project.status}`)
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(e) => {
				if (e.key === 'Enter') onSelect()
			}}
			className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer hover:bg-muted/50"
		>
			<span className={`inline-block size-2 rounded-full ${dotClass}`} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 text-sm font-medium truncate">
					{project.name}
					<span className="text-[10px] text-muted-foreground font-normal">{statusLabel}</span>
				</div>
				<div className="text-[11px] text-muted-foreground truncate">
					{project.originPatterns[0] || t('sniff.project.origin')}
					<span className="ml-2">
						{t('sniff.project.stats.samples', {
							count: String(project.stats.totalSamples),
						})}
						{' · '}
						{t('sniff.project.stats.apis', {
							count: String(project.stats.totalApis),
						})}
					</span>
				</div>
			</div>
			<button
				type="button"
				className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
				title={t('sniff.project.delete')}
				onClick={(e) => {
					e.stopPropagation()
					onDelete()
				}}
			>
				<Trash2 className="size-3.5" />
			</button>
			<CirclePlay className="size-4 text-muted-foreground/60" />
		</div>
	)
}
