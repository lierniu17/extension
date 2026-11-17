import { useEffect, useState } from 'react'
import {
	ChevronDown,
	ChevronRight,
	CircleCheck,
	CircleX,
	Eye,
	EyeOff,
	LoaderCircle,
	TriangleAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { probeCapabilities } from '@/llms'
import type { ProbeCheck, ProbeResult } from '@/llms/probe'
import type { AgentUiConfig } from '@/agent/useAgent'
import type { SupportedLanguage } from '@/core/types'

type SaveState =
	| { kind: 'idle' }
	| { kind: 'probing' }
	| { kind: 'error'; error: string }
	| { kind: 'success'; probe: ProbeResult }

function stringifyProbeValue(value: unknown) {
	if (value == null) return ''
	if (typeof value === 'string') return value
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	try {
		return JSON.stringify(value)
	} catch {
		return '[unrenderable]'
	}
}

function CapabilityRow({ name, probe, fallback, manualInput }: {
	name: string
	probe: ProbeCheck<unknown>
	fallback?: number
	manualInput?: { value: string; onChange: (value: string) => void }
}) {
	const { t } = useI18n()
	const [showDetail, setShowDetail] = useState<boolean>(false)
	const labelKey = `general.capability.${name}.label`
	const stateKey = probe.inconclusive
		? `general.capability.${name}.inconclusive`
		: `general.capability.${name}.${probe.supported ? 'supported' : 'unsupported'}`
	const params: Record<string, string> = {}
	if (probe.value != null) params.value = stringifyProbeValue(probe.value)
	if (fallback != null) params.fallback = String(fallback)
	const supported = probe.supported
	const hasDetail = Boolean(probe.error || probe.evidence)
	return (
		<div
			className={cn(
				'flex items-start gap-2 rounded-lg border px-4 py-3',
				supported
					? 'border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10'
					: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
			)}
		>
			{supported ? (
				<CircleCheck className="size-5 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
			) : (
				<TriangleAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
			)}
			<div
				className={cn(
					'flex-1 text-sm space-y-1',
					supported ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'
				)}
			>
				<div>
					<span className="font-semibold">{t(labelKey)}</span>
					<span className="opacity-80">{' · '}</span>
					<span>{t(stateKey, params)}</span>
				</div>
				{hasDetail && (
					<button
						type="button"
						className="flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100 cursor-pointer"
						onClick={() => setShowDetail((v) => !v)}
					>
						{showDetail ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
						{t('general.capability.common.toggleDetail')}
					</button>
				)}
				{showDetail && (
					<div className="mt-1 text-xs space-y-1 opacity-80">
						{probe.error && (
							<div>
								<span className="font-semibold">
									{t('general.capability.common.error')}
									{': '}
								</span>
								<span className="font-mono break-all">{probe.error}</span>
							</div>
						)}
						{probe.evidence && (
							<div>
								<span className="font-semibold">
									{t('general.capability.common.evidence')}
									{': '}
								</span>
								<span className="font-mono break-all">{probe.evidence}</span>
							</div>
						)}
					</div>
				)}
				{manualInput && !probe.supported && (
					<div className="mt-2 space-y-1">
						<label className="text-xs font-semibold block">
							{t('general.capability.contextLength.manualLabel')}
						</label>
						<Input
							type="number"
							min={1}
							step={1}
							value={manualInput.value}
							onChange={(e) => manualInput.onChange(e.target.value)}
							placeholder={t('general.capability.contextLength.manualPlaceholder', {
								fallback: fallback != null ? String(fallback) : '',
							})}
							className="h-8 text-sm"
						/>
					</div>
				)}
			</div>
		</div>
	)
}

const CONTEXT_LENGTH_FALLBACK = 32e3

function parseManualContextLength(raw: string) {
	const n = Number.parseInt(raw.trim(), 10)
	if (!Number.isFinite(n) || n <= 0) return undefined
	return n
}

function resolveSupportsVision(probe: ProbeResult, previous: boolean | undefined) {
	if (probe.vision.inconclusive) return previous
	return probe.vision.supported
}

function resolveContextLength(probe: ProbeResult, manualRaw: string) {
	if (
		probe.contextLength.supported &&
		probe.contextLength.value !== null &&
		probe.contextLength.value !== undefined
	) {
		return probe.contextLength.value
	}
	return parseManualContextLength(manualRaw)
}

const CAPABILITY_RENDER_ORDER = ['tokenParam', 'vision', 'contextLength'] as const

export function GeneralSection({ config, onSave }: { config: AgentUiConfig | null; onSave: (config: AgentUiConfig) => Promise<void> }) {
	const { t } = useI18n()
	const [baseURL, setBaseURL] = useState<string>(config?.baseURL ?? '')
	const [model, setModel] = useState<string>(config?.model ?? '')
	const [apiKey, setApiKey] = useState<string>(config?.apiKey ?? '')
	const [language, setLanguage] = useState<SupportedLanguage | undefined>(config?.language ?? 'zh-CN')
	const [tempEnabled, setTempEnabled] = useState<boolean>(
		config?.temperature !== null && config?.temperature !== undefined
	)
	const [tempValue, setTempValue] = useState<number>(config?.temperature ?? 0.7)
	const [showApiKey, setShowApiKey] = useState<boolean>(false)
	const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' })
	const [manualContextLength, setManualContextLength] = useState<string>(
		config?.contextLength !== null && config?.contextLength !== undefined
			? String(config.contextLength)
			: ''
	)
	useEffect(() => {
		setBaseURL(config?.baseURL ?? '')
		setModel(config?.model ?? '')
		setApiKey(config?.apiKey ?? '')
		setLanguage(config?.language ?? 'zh-CN')
		setTempEnabled(config?.temperature !== null && config?.temperature !== undefined)
		setTempValue(config?.temperature ?? 0.7)
		setManualContextLength(
			config?.contextLength !== null && config?.contextLength !== undefined
				? String(config.contextLength)
				: ''
		)
	}, [config])
	const handleSave = async () => {
		if (!config) return
		if (!baseURL.trim() || !model.trim()) {
			setSaveState({ kind: 'error', error: t('general.probeMissingFields') })
			return
		}
		setSaveState({ kind: 'probing' })
		let probe
		try {
			probe = await probeCapabilities(
				{ baseURL: baseURL.trim(), model: model.trim(), apiKey: apiKey.trim() },
				{ force: true }
			)
		} catch (error) {
			setSaveState({
				kind: 'error',
				error: error instanceof Error ? error.message : String(error),
			})
			return
		}
		if (!probe.ok) {
			setSaveState({ kind: 'error', error: probe.connectivityError ?? 'Unknown error' })
			return
		}
		try {
			await onSave({
				...config,
				apiKey,
				baseURL,
				model,
				language,
				temperature: tempEnabled ? tempValue : undefined,
				supportsVision: resolveSupportsVision(probe, config.supportsVision),
				contextLength: resolveContextLength(probe, manualContextLength),
				tokenLimitParam: probe.tokenParam.value,
			})
			setSaveState({ kind: 'success', probe })
		} catch (error) {
			setSaveState({
				kind: 'error',
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}
	return (
		<div className="space-y-10">
			<h2 className="text-2xl font-bold text-foreground">{t('general.title')}</h2>
			<div className="rounded-xl border p-8 space-y-6">
				<div className="space-y-2">
					<label className="text-base font-semibold text-foreground">{t('general.baseUrl')}</label>
					<Input
						placeholder={t('general.baseUrl.placeholder')}
						value={baseURL}
						onChange={(e) => setBaseURL(e.target.value)}
						className="h-10 text-base"
					/>
				</div>
				<div className="space-y-2">
					<label className="text-base font-semibold text-foreground">{t('general.model')}</label>
					<Input
						placeholder={t('general.model.placeholder')}
						value={model}
						onChange={(e) => setModel(e.target.value)}
						className="h-10 text-base"
					/>
				</div>
				<div className="space-y-2">
					<label className="text-base font-semibold text-foreground">{t('general.apiKey')}</label>
					<div className="flex gap-2 items-center">
						<Input
							type={showApiKey ? 'text' : 'password'}
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							className="h-10 text-base"
						/>
						<Button
							variant="outline"
							size="icon"
							className="h-10 w-10 shrink-0 cursor-pointer"
							onClick={() => setShowApiKey(!showApiKey)}
						>
							{showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
						</Button>
					</div>
				</div>
				<div className="space-y-2">
					<label className="text-base font-semibold text-foreground">
						{t('general.responseLanguage')}
					</label>
					<select
						value={language ?? ''}
						onChange={(e) => setLanguage((e.target.value || undefined) as SupportedLanguage | undefined)}
						className="w-full h-10 text-base rounded-lg border border-input bg-background px-3 cursor-pointer"
					>
						<option value="">{t('general.responseLanguage.system')}</option>
						<option value="en-US">{t('general.responseLanguage.en')}</option>
						<option value="zh-CN">{t('general.responseLanguage.zh')}</option>
					</select>
				</div>
				<div className="space-y-2">
					<label className="flex items-center justify-between">
						<div>
							<span className="text-base font-semibold text-foreground">
								{t('general.temperature')}
							</span>
							<p className="text-sm text-foreground/50 mt-0.5">{t('general.temperature.desc')}</p>
						</div>
						<Switch checked={tempEnabled} onCheckedChange={setTempEnabled} />
					</label>
					{tempEnabled && (
						<Input
							type="number"
							min={0}
							max={2}
							step={0.1}
							value={tempValue}
							onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
							className="h-10 text-base w-32"
						/>
					)}
				</div>
				<div className="pt-3 space-y-3">
					<Button
						onClick={handleSave}
						disabled={saveState.kind === 'probing'}
						className="cursor-pointer h-10 px-8 text-base"
					>
						{saveState.kind === 'probing' ? (
							<>
								<LoaderCircle className="size-4 animate-spin mr-2" />
								{t('common.saving')}
							</>
						) : (
							t('common.save')
						)}
					</Button>
					{saveState.kind === 'probing' && (
						<div className="flex items-center gap-2 text-sm text-foreground/60">
							<LoaderCircle className="size-4 animate-spin" />
							<span>{t('general.probing')}</span>
						</div>
					)}
					{saveState.kind === 'success' && (
						<div className="space-y-2">
							<div className="text-sm text-foreground/70">{t('general.probeSuccess')}</div>
							{CAPABILITY_RENDER_ORDER.map((name) => (
								<CapabilityRow
									key={name}
									name={name}
									probe={saveState.probe[name]}
									fallback={name === 'contextLength' ? CONTEXT_LENGTH_FALLBACK : undefined}
									manualInput={
										name === 'contextLength'
											? {
													value: manualContextLength,
													onChange: setManualContextLength,
												}
											: undefined
									}
								/>
							))}
							{!saveState.probe.contextLength.supported && (
								<p className="text-xs text-foreground/60">
									{t('general.capability.contextLength.manualHint')}
								</p>
							)}
						</div>
					)}
					{saveState.kind === 'error' && (
						<div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 px-4 py-3">
							<CircleX className="size-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
							<div className="flex-1 text-sm text-red-800 dark:text-red-300 space-y-1">
								<div>{t('general.probeFailure')}</div>
								<div className="text-xs opacity-80">
									<span className="font-semibold">
										{t('general.probeFailure.detail')}
										{': '}
									</span>
									<span className="font-mono break-all">{saveState.error}</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
