import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'
import type { AgentUiConfig } from '@/agent/useAgent'

export function AdvancedSection({ config, onSave }: { config: AgentUiConfig | null; onSave: (config: AgentUiConfig) => Promise<void> }) {
	const { t } = useI18n()
	const [maxSteps, setMaxSteps] = useState<number | undefined>(config?.maxSteps)
	const [systemInstruction, setSystemInstruction] = useState<string>(config?.systemInstruction ?? '')
	const [experimentalLlmsTxt, setExperimentalLlmsTxt] = useState<boolean>(
		config?.experimentalLlmsTxt ?? false
	)
	const [experimentalIncludeAllTabs, setExperimentalIncludeAllTabs] = useState<boolean>(
		config?.experimentalIncludeAllTabs ?? false
	)
	const [autoExecDelaySec, setAutoExecDelaySec] = useState<number>(config?.autoExecDelaySec ?? 3)
	const [scriptDigest, setScriptDigest] = useState<boolean>(config?.scriptInPromptStrategy === 'digest')
	const [developerMode, setDeveloperMode] = useState<boolean>(false)
	const [saving, setSaving] = useState<boolean>(false)
	const [saved, setSaved] = useState<boolean>(false)
	useEffect(() => {
		chrome.storage.local.get('developerMode').then((r) => setDeveloperMode(!!r.developerMode))
	}, [])
	useEffect(() => {
		setMaxSteps(config?.maxSteps)
		setSystemInstruction(config?.systemInstruction ?? '')
		setExperimentalLlmsTxt(config?.experimentalLlmsTxt ?? false)
		setExperimentalIncludeAllTabs(config?.experimentalIncludeAllTabs ?? false)
		setAutoExecDelaySec(config?.autoExecDelaySec ?? 3)
		setScriptDigest(config?.scriptInPromptStrategy === 'digest')
	}, [config])
	const handleSave = async () => {
		if (!config) return
		setSaving(true)
		try {
			await onSave({
				...config,
				maxSteps: maxSteps || undefined,
				systemInstruction: systemInstruction || undefined,
				experimentalLlmsTxt,
				experimentalIncludeAllTabs,
				scriptInPromptStrategy: scriptDigest ? 'digest' : 'full',
				autoExecDelaySec,
			})
			setSaved(true)
			setTimeout(() => setSaved(false), 2e3)
		} finally {
			setSaving(false)
		}
	}
	async function handleSwitchSave<K extends keyof AgentUiConfig>(key: K, value: AgentUiConfig[K]) {
		if (!config) return
		const next = { ...config, [key]: value }
		await onSave(next)
	}
	return (
		<div className="space-y-10">
			<h2 className="text-2xl font-bold text-foreground">{t('advanced.title')}</h2>
			<div className="rounded-xl border p-8 space-y-6">
				<div className="space-y-2">
					<label className="text-base font-semibold text-foreground">
						{t('advanced.maxSteps')}
					</label>
					<p className="text-sm text-foreground/50">{t('advanced.maxSteps.desc')}</p>
					<Input
						type="number"
						placeholder={t('advanced.maxSteps.placeholder')}
						min={1}
						max={200}
						value={maxSteps ?? ''}
						onChange={(e) => setMaxSteps(e.target.value ? Number(e.target.value) : undefined)}
						className="h-10 text-base [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
					/>
				</div>
				<div className="space-y-2">
					<label className="text-base font-semibold text-foreground">
						{t('advanced.systemInstruction')}
					</label>
					<p className="text-sm text-foreground/50">{t('advanced.systemInstruction.desc')}</p>
					<textarea
						placeholder={t('advanced.systemInstruction.placeholder')}
						value={systemInstruction}
						onChange={(e) => setSystemInstruction(e.target.value)}
						rows={4}
						className="w-full text-base rounded-lg border border-input bg-background px-4 py-3 resize-y min-h-[100px]"
					/>
				</div>
				<div className="space-y-2">
					<label className="text-base font-semibold text-foreground">
						{t('advanced.autoExecDelay')}
					</label>
					<p className="text-sm text-foreground/50">{t('advanced.autoExecDelay.desc')}</p>
					<Input
						type="number"
						min={3}
						max={60}
						value={autoExecDelaySec}
						onChange={(e) => {
							const v = Math.max(3, Math.min(60, parseInt(e.target.value) || 3))
							setAutoExecDelaySec(v)
						}}
						className="h-10 text-base w-32 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
					/>
				</div>
				<div className="pt-3">
					<Button
						onClick={handleSave}
						disabled={saving}
						className="cursor-pointer h-10 px-8 text-base"
					>
						{saving ? (
							<LoaderCircle className="size-4 animate-spin" />
						) : saved ? (
							t('common.saved')
						) : (
							t('common.save')
						)}
					</Button>
				</div>
			</div>
			<div className="rounded-xl border p-8 space-y-5">
				<label className="flex items-center justify-between cursor-pointer py-1">
					<div>
						<span className="text-base text-foreground">{t('advanced.experimentalLlmsTxt')}</span>
						<p className="text-sm text-foreground/50 mt-0.5">
							{t('advanced.experimentalLlmsTxt.desc')}
						</p>
					</div>
					<Switch
						checked={experimentalLlmsTxt}
						onCheckedChange={(v) => {
							setExperimentalLlmsTxt(v)
							handleSwitchSave('experimentalLlmsTxt', v)
						}}
					/>
				</label>
				<label className="flex items-center justify-between cursor-pointer py-1">
					<div>
						<span className="text-base text-foreground">
							{t('advanced.experimentalIncludeAllTabs')}
						</span>
						<p className="text-sm text-foreground/50 mt-0.5">
							{t('advanced.experimentalIncludeAllTabs.desc')}
						</p>
					</div>
					<Switch
						checked={experimentalIncludeAllTabs}
						onCheckedChange={(v) => {
							setExperimentalIncludeAllTabs(v)
							handleSwitchSave('experimentalIncludeAllTabs', v)
						}}
					/>
				</label>
				<label className="flex items-center justify-between cursor-pointer py-1">
					<div>
						<span className="text-base text-foreground">{t('advanced.scriptDigest')}</span>
						<p className="text-sm text-foreground/50 mt-0.5">{t('advanced.scriptDigest.desc')}</p>
					</div>
					<Switch
						checked={scriptDigest}
						onCheckedChange={(v) => {
							setScriptDigest(v)
							handleSwitchSave('scriptInPromptStrategy', v ? 'digest' : 'full')
						}}
					/>
				</label>
				<label className="flex items-center justify-between cursor-pointer py-1">
					<div>
						<span className="text-base text-foreground">{t('advanced.developerMode')}</span>
						<p className="text-sm text-foreground/50 mt-0.5">{t('advanced.developerMode.desc')}</p>
					</div>
					<Switch
						checked={developerMode}
						onCheckedChange={(v) => {
							setDeveloperMode(v)
							chrome.storage.local.set({ developerMode: v })
						}}
					/>
				</label>
			</div>
		</div>
	)
}
