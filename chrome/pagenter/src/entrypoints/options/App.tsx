// TODO(types)
import { useCallback, useEffect, useState } from 'react'
import { Globe, Info, X } from 'lucide-react'
import { useI18n, type Locale } from '@/i18n'
import { Logo } from '@/components/misc'
import { DEFAULT_SYSTEM_INSTRUCTION, resolveLlmConfig } from '@/agent/constants'
import { AboutSection } from './sections/AboutSection'
import { AdvancedSection } from './sections/AdvancedSection'
import { GeneralSection } from './sections/GeneralSection'
import { HubSection } from './sections/HubSection'
import { SniffSection } from './sections/SniffSection'
import { TipScriptSection } from './sections/TipScriptSection'

const SECTION_IDS = ['general', 'advanced', 'tipScript', 'hub', 'sniff', 'about']

function sectionFromHash() {
	const id = window.location.hash.slice(1)
	return SECTION_IDS.includes(id) ? id : 'general'
}

function useExtConfig() {
	const [config, setConfig] = useState<any>(null)
	useEffect(() => {
		chrome.storage.local.get(['llmConfig', 'language', 'advancedConfig']).then((result) => {
			const llmConfig = resolveLlmConfig(result.llmConfig)
			const language = result.language || 'zh-CN'
			const stored = result.advancedConfig ?? {}
			const advancedConfig = {
				systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
				...stored,
			}
			setConfig({ ...llmConfig, ...advancedConfig, language })
		})
	}, [])
	const saveConfig = useCallback(
		async ({
			language,
			maxSteps,
			systemInstruction,
			experimentalLlmsTxt,
			experimentalIncludeAllTabs,
			autoExecDelaySec,
			...llmConfig
		}: any) => {
			await chrome.storage.local.set({ llmConfig })
			if (language) {
				await chrome.storage.local.set({ language })
			} else {
				await chrome.storage.local.remove('language')
			}
			const advancedConfig = {
				maxSteps,
				systemInstruction,
				experimentalLlmsTxt,
				experimentalIncludeAllTabs,
				autoExecDelaySec,
			}
			await chrome.storage.local.set({ advancedConfig })
			setConfig({ ...llmConfig, ...advancedConfig, language })
		},
		[]
	)
	return { config, saveConfig }
}

export default function App() {
	const { t, setLocale, userLocale } = useI18n()
	const [activeSection, setActiveSection] = useState<any>(sectionFromHash)
	const [showSavedTip, setShowSavedTip] = useState<any>(false)
	const { config, saveConfig: rawSaveConfig } = useExtConfig()
	useEffect(() => {
		const syncSection = () => setActiveSection(sectionFromHash())
		window.addEventListener('hashchange', syncSection)
		return () => window.removeEventListener('hashchange', syncSection)
	}, [])
	const saveConfig = useCallback(
		async (cfg: any) => {
			await rawSaveConfig(cfg)
			setShowSavedTip(true)
		},
		[rawSaveConfig]
	)
	const navItems = [
		{ id: 'general', labelKey: 'nav.general' },
		{ id: 'advanced', labelKey: 'nav.advanced' },
		{ id: 'tipScript', labelKey: 'nav.tipScript' },
		{ id: 'hub', labelKey: 'nav.hub' },
		{ id: 'sniff', labelKey: 'nav.sniff' },
		{ id: 'about', labelKey: 'nav.about' },
	]
	return (
		<div className="flex justify-center min-h-screen bg-background">
			<div className="flex w-full max-w-4xl">
				<aside className="w-56 shrink-0 pt-10 pr-6">
					<div className="flex items-center gap-2.5 px-4 mb-8">
						<Logo className="size-7" />
						<span className="text-base font-bold">Pagenter</span>
					</div>
					<nav className="space-y-1 px-2">
						{navItems.map(({ id, labelKey }) => (
							<button
								key={id}
								type="button"
								onClick={() => {
									setActiveSection(id)
									window.location.hash = id
								}}
								className={`w-full text-left px-4 py-2.5 rounded-lg text-[15px] font-bold transition-colors cursor-pointer ${activeSection === id ? 'bg-blue-500/10 text-blue-600' : 'text-foreground/70 hover:bg-muted hover:text-foreground'}`}
							>
								{t(labelKey)}
							</button>
						))}
					</nav>
					<div className="mt-8 px-4">
						<div className="flex items-center gap-2 mb-2">
							<Globe className="size-4 text-foreground/50" />
							<span className="text-sm text-foreground/50">{t('language.title')}</span>
						</div>
						<select
							value={userLocale ?? ''}
							onChange={(e) => setLocale((e.target.value as Locale) || undefined)}
							className="w-full h-9 text-sm rounded-lg border border-input bg-background px-3 cursor-pointer"
						>
							<option value="">{t('language.followSystem')}</option>
							<option value="en">English</option>
							<option value="zh-CN">中文</option>
						</select>
					</div>
				</aside>
				<main className="flex-1 min-w-0 pt-10 pb-16 pl-8">
					{showSavedTip && (
						<div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 px-5 py-3.5">
							<Info className="size-5 shrink-0 text-blue-600 dark:text-blue-400" />
							<span className="flex-1 text-sm text-blue-800 dark:text-blue-300">
								{t('common.settingsChanged')}
							</span>
							<button
								type="button"
								onClick={() => setShowSavedTip(false)}
								className="shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 cursor-pointer"
							>
								<X className="size-4" />
							</button>
						</div>
					)}
					{activeSection === 'general' && <GeneralSection config={config} onSave={saveConfig} />}
					{activeSection === 'advanced' && <AdvancedSection config={config} onSave={saveConfig} />}
					{activeSection === 'tipScript' && <TipScriptSection />}
					{activeSection === 'hub' && (
						<HubSection onSettingsChanged={() => setShowSavedTip(true)} />
					)}
					{activeSection === 'sniff' && (
						<SniffSection onSettingsChanged={() => setShowSavedTip(true)} />
					)}
					{activeSection === 'about' && <AboutSection />}
				</main>
			</div>
		</div>
	)
}
