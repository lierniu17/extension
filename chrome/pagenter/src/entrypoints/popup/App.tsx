import { useI18n } from '@/i18n'
import { getMatchingTipScripts } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { ExternalLink, PanelRight, Play, Settings, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TipScriptRecord } from '@/lib/dbSchema'

export default function App() {
	const { t } = useI18n()
	const [tipScripts, setTipScripts] = useState<TipScriptRecord[]>([])
	const [currentUrl, setCurrentUrl] = useState('')
	const [runningId, setRunningId] = useState<string | null>(null)
	useEffect(() => {
		chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
			const url = tab?.url || ''
			setCurrentUrl(url)
			if (url) {
				getMatchingTipScripts(url).then(setTipScripts)
			}
		})
	}, [])
	const handleRun = async (mz: TipScriptRecord) => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		if (!tab?.id) return
		setRunningId(mz.id)
		try {
			await chrome.runtime.sendMessage({
				type: 'TIPSCRIPT_EXECUTE',
				tabId: tab.id,
				script: mz.script,
			})
		} catch (err) {
			console.error('[Popup] Failed to execute tipscript:', err)
		} finally {
			setRunningId(null)
		}
	}
	const handleOpenSidePanel = async () => {
		const win = await chrome.windows.getCurrent()
		if (win.id) {
			await chrome.sidePanel.open({ windowId: win.id })
		}
		window.close()
	}
	const handleOpenOptions = () => {
		chrome.runtime.openOptionsPage()
		window.close()
	}
	const manualScripts = tipScripts.filter((ts) => ts.triggerMode === 'manual')
	const autoScripts = tipScripts.filter((ts) => ts.triggerMode === 'auto')
	return (
		<div className="w-80 bg-background text-foreground">
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<span className="text-sm font-semibold">Pagenter</span>
				</div>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={handleOpenSidePanel}
					className="cursor-pointer"
					title={t('popup.openSidePanel')}
				>
					<PanelRight className="size-4" />
				</Button>
			</div>
			<div className="px-4 py-3 space-y-3">
				{tipScripts.length === 0 ? (
					<div className="text-center py-6 text-sm text-muted-foreground">
						<Zap className="size-8 mx-auto mb-2 opacity-30" />
						<p>{t('popup.noTipScript')}</p>
						<p className="text-xs mt-1 opacity-70">{t('popup.noTipScript.hint')}</p>
					</div>
				) : (
					<>
						{manualScripts.length > 0 && (
							<div className="space-y-1.5">
								<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
									{t('popup.manualScripts')}
								</div>
								{manualScripts.map((mz) => (
									<div
										key={mz.id}
										className="flex items-center justify-between rounded-lg border px-3 py-2"
									>
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium truncate">{mz.name}</div>
											{mz.description && (
												<div className="text-xs text-muted-foreground truncate">
													{mz.description}
												</div>
											)}
										</div>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => handleRun(mz)}
											disabled={runningId === mz.id}
											className="ml-2 cursor-pointer shrink-0"
										>
											<Play className="size-3.5" />
										</Button>
									</div>
								))}
							</div>
						)}
						{autoScripts.length > 0 && (
							<div className="space-y-1.5">
								<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
									{t('popup.autoScripts')}
								</div>
								{autoScripts.map((mz) => (
									<div
										key={mz.id}
										className="flex items-center justify-between rounded-lg border px-3 py-2 opacity-70"
									>
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium truncate">{mz.name}</div>
										</div>
										<span className="text-[10px] text-green-600 shrink-0">
											{t('popup.autoActive')}
										</span>
									</div>
								))}
							</div>
						)}
					</>
				)}
			</div>
			<div className="flex items-center gap-2 px-4 py-3 border-t">
				<Button
					variant="outline"
					size="sm"
					className="flex-1 cursor-pointer text-xs"
					onClick={handleOpenOptions}
				>
					<Settings className="size-3 mr-1.5" />
					{t('popup.manageTipScript')}
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="flex-1 cursor-pointer text-xs"
					onClick={handleOpenSidePanel}
				>
					<ExternalLink className="size-3 mr-1.5" />
					{t('popup.openSidePanel')}
				</Button>
			</div>
		</div>
	)
}
