import { ApiDetail } from '@/components/sniff/ApiDetail'
import { useApiList } from '@/components/sniff/hooks'
import { useI18n } from '@/i18n'
import { getProject } from '@/lib/sniff/db'
import { ChevronLeft, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SniffProject } from '@/lib/dbSchema'

export function ProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
	const { t } = useI18n()
	const [project, setProject] = useState<SniffProject | null>(null)
	const [subTab, setSubTab] = useState('apis')
	const [selectedApiId, setSelectedApiId] = useState<string | null>(null)
	useEffect(() => {
		let cancelled = false
		const load = async () => {
			const p = await getProject(projectId)
			if (!cancelled) setProject(p ?? null)
		}
		load()
		const timer = setInterval(load, 1e3)
		return () => {
			cancelled = true
			clearInterval(timer)
		}
	}, [projectId])
	const startRecording = useCallback(async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		if (!tab?.id) return
		await chrome.runtime.sendMessage({
			type: 'SNIFF_START_RECORDING',
			tabId: tab.id,
			projectId,
		})
	}, [projectId])
	const stopRecording = useCallback(async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		if (!tab?.id) return
		await chrome.runtime.sendMessage({
			type: 'SNIFF_STOP_RECORDING',
			tabId: tab.id,
			projectId,
		})
	}, [projectId])
	if (!project) {
		return <div className="p-6 text-center text-xs text-muted-foreground">Loading project...</div>
	}
	const isRecording = project.status === 'recording'
	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center gap-2 px-3 py-2 border-b">
				<button type="button" onClick={onBack} className="p-1 rounded hover:bg-muted" title="Back">
					<ChevronLeft className="size-4" />
				</button>
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium truncate">{project.name}</div>
					<div className="text-[11px] text-muted-foreground truncate">
						{project.originPatterns[0] || '(no origin)'}
					</div>
				</div>
				{isRecording ? (
					<Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1">
						<Pause className="size-3.5" />
						{t('sniff.project.stop')}
					</Button>
				) : (
					<Button size="sm" onClick={startRecording} className="gap-1">
						<Play className="size-3.5" />
						{t('sniff.project.startOn')}
					</Button>
				)}
			</div>
			<div className="flex border-b text-xs">
				{['apis', 'settings'].map((k) => (
					<button
						key={k}
						type="button"
						onClick={() => {
							setSubTab(k)
							setSelectedApiId(null)
						}}
						className={`flex-1 py-2 border-b-2 -mb-px transition-colors ${subTab === k ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
					>
						{t(`sniff.project.tab.${k}`)}
					</button>
				))}
			</div>
			<div className="flex-1 overflow-y-auto">
				{subTab === 'apis' &&
					(selectedApiId ? (
						<ApiDetail apiId={selectedApiId} onBack={() => setSelectedApiId(null)} />
					) : (
						<ApiList projectId={projectId} onSelect={setSelectedApiId} />
					))}
				{subTab === 'settings' && <SettingsPane project={project} />}
			</div>
		</div>
	)
}

function ApiList({ projectId, onSelect }: { projectId: string; onSelect: (apiId: string) => void }) {
	const { t } = useI18n()
	const { apis, loading } = useApiList(projectId)
	const sorted = useMemo(() => [...apis].sort((a, b) => b.sampleCount - a.sampleCount), [apis])
	if (loading) {
		return <div className="p-6 text-center text-xs text-muted-foreground">Loading...</div>
	}
	if (sorted.length === 0) {
		return (
			<div className="p-6 text-center text-xs text-muted-foreground">
				No APIs captured yet. Start recording on a tab to collect samples.
			</div>
		)
	}
	return (
		<div>
			{sorted.map((api) => (
				<button
					key={api.id}
					type="button"
					onClick={() => onSelect(api.id)}
					className="w-full flex items-center gap-2 px-3 py-2 border-b text-left hover:bg-muted/50"
				>
					<span
						className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded ${methodColor(api.method)}`}
					>
						{api.method}
					</span>
					<div className="flex-1 min-w-0">
						<div className="text-xs font-mono truncate">{api.urlPattern}</div>
						<div className="text-[10px] text-muted-foreground">
							{t('sniff.api.samples')}
							{': '}
							{api.sampleCount}
							{api.exposed && (
								<span className="ml-2 text-primary">
									{'● '}
									{t('sniff.api.expose')}
								</span>
							)}
						</div>
					</div>
				</button>
			))}
		</div>
	)
}

function methodColor(method: string) {
	switch (method.toUpperCase()) {
		case 'GET':
			return 'bg-green-100 text-green-800'
		case 'POST':
			return 'bg-blue-100 text-blue-800'
		case 'PUT':
		case 'PATCH':
			return 'bg-yellow-100 text-yellow-800'
		case 'DELETE':
			return 'bg-red-100 text-red-800'
		default:
			return 'bg-gray-100 text-gray-800'
	}
}

function SettingsPane({ project }: { project: SniffProject }) {
	return (
		<div className="p-3 text-xs space-y-2">
			<SettingRow k="maxBodyKB" v={String(project.config.maxBodyKB)} />
			<SettingRow k="maxSamplesPerApi" v={String(project.config.maxSamplesPerApi)} />
			<SettingRow k="enablePiiScrub" v={String(project.config.enablePiiScrub)} />
			<SettingRow k="captureStaticResources" v={String(project.config.captureStaticResources)} />
			<SettingRow
				k="excludeMimePatterns"
				v={project.config.excludeMimePatterns.join(', ') || '(none)'}
			/>
			<SettingRow
				k="excludeUrlPatterns"
				v={project.config.excludeUrlPatterns.join(', ') || '(none)'}
			/>
			<div className="pt-2 text-[10px] text-muted-foreground">
				Edit via Options page (coming soon).
			</div>
		</div>
	)
}

function SettingRow({ k, v }: { k: string; v: string }) {
	return (
		<div className="flex gap-2">
			<span className="w-32 font-mono text-muted-foreground shrink-0">{k}</span>
			<span className="flex-1 font-mono break-all">{v}</span>
		</div>
	)
}
