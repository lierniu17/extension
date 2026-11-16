// TODO(types)
import { useI18n } from '@/i18n'
import { useAgent } from '@/agent/useAgent'
import { listTipScripts } from '@/lib/db'
import { exportSessionAsMarkdown } from '@/lib/session-export'
import { HistoryList } from '@/components/HistoryList'
import { HistoryDetail } from '@/components/HistoryDetail'
import { TipScriptConfirmDialog } from '@/components/TipScriptConfirmDialog'
import {
	BookOpen,
	ClipboardList,
	History,
	CodeXml,
	Crosshair,
	Eye,
	EyeOff,
	FileCode,
	MousePointerClick,
	Plus,
	Radio,
	Send,
	Settings,
	Square,
	X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SniffView } from '@/components/sniff/SniffView'
import { ActivityCard, EventCard } from '@/components/cards'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from '@/components/ui/input-group'
import { useCallback, useEffect, useRef, useState } from 'react'

export default function App() {
	const { t } = useI18n()
	const [view, setView] = useState<any>({ name: 'chat' })
	const [inputValue, setInputValue] = useState('')
	const historyRef = useRef<any>(null)
	const textareaRef = useRef<any>(null)
	const {
		status,
		history,
		activity,
		currentTask,
		mode,
		setMode,
		modelInfo,
		execute,
		stop,
		newChat,
		addPickedElement,
		tipScriptProposal,
		openTipScriptProposal,
		confirmTipScript,
		dismissTipScript,
		attachedScript,
		setAttachedScript,
		getCurrentScript,
	} = useAgent()
	useEffect(() => {
		if (historyRef.current) {
			historyRef.current.scrollTop = historyRef.current.scrollHeight
		}
	}, [history, activity])
	useEffect(() => {
		const onRemoteSync = () => setView({ name: 'chat' })
		window.addEventListener('pagenter:session-sync', onRemoteSync)
		return () => window.removeEventListener('pagenter:session-sync', onRemoteSync)
	}, [])
	const runTask = useCallback(
		(task: any) => {
			const normalizedTask = task.trim()
			if (!normalizedTask || status === 'running') return
			setInputValue('')
			setView({ name: 'chat' })
			execute(normalizedTask).catch((error) => {
				console.error('[SidePanel] Failed to execute task:', error)
			})
		},
		[execute, status]
	)
	const handleSubmit = useCallback(
		(e?: any) => {
			e?.preventDefault()
			runTask(inputValue)
		},
		[inputValue, runTask]
	)
	const handleStop = useCallback(() => {
		console.log('[SidePanel] Stopping task...')
		stop()
	}, [stop])
	const handleKeyDown = (e: any) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault()
			handleSubmit()
		}
	}
	const KEEP_HIGHLIGHTS_MS = 5e3
	const [markCopied, setMarkCopied] = useState(false)
	const handleMarkAndCopy = useCallback(async () => {
		try {
			const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
			if (!tab?.id) return
			await chrome.storage.local.set({
				keepHighlightsUntil: Date.now() + KEEP_HIGHLIGHTS_MS,
			})
			const res = await chrome.runtime.sendMessage({
				type: 'PAGE_CONTROL',
				action: 'get_browser_state',
				targetTabId: tab.id,
			})
			const content = res?.content || res?.error || '(empty)'
			await navigator.clipboard.writeText(content)
			setMarkCopied(true)
			setTimeout(() => {
				setMarkCopied(false)
				chrome.storage.local.remove('keepHighlightsUntil')
			}, KEEP_HIGHLIGHTS_MS)
		} catch (err) {
			console.error('[SidePanel] Mark & copy failed:', err)
		}
	}, [])
	const [picking, setPicking] = useState(false)
	const pickingTabIdRef = useRef<any>(null)
	const tRef = useRef(t)
	useEffect(() => {
		tRef.current = t
	})
	const startPickerOn = useCallback(async (tabId: any) => {
		try {
			await chrome.tabs.sendMessage(tabId, {
				type: 'ELEMENT_PICKER',
				action: 'start',
				payload: {
					hintTitle: tRef.current('picker.hint.title'),
					hintEsc: tRef.current('picker.hint.esc'),
				},
			})
		} catch {}
	}, [])
	const stopPickerOn = useCallback(async (tabId: any) => {
		try {
			await chrome.tabs.sendMessage(tabId, {
				type: 'ELEMENT_PICKER',
				action: 'stop',
			})
		} catch {}
	}, [])
	const handlersRef = useRef({ addPickedElement, setInputValue })
	useEffect(() => {
		handlersRef.current = { addPickedElement, setInputValue }
	})
	const handleElementPick = useCallback(async () => {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
		if (!tab?.id) return
		if (picking) {
			if (pickingTabIdRef.current != null) {
				await stopPickerOn(pickingTabIdRef.current)
			}
			pickingTabIdRef.current = null
			setPicking(false)
			return
		}
		pickingTabIdRef.current = tab.id
		setPicking(true)
		await startPickerOn(tab.id)
	}, [picking, startPickerOn, stopPickerOn])
	useEffect(() => {
		if (!picking) return
		const onMessage = (message: any) => {
			if (message.type === 'ELEMENT_PICKED') {
				const { addPickedElement: addPickedElement2, setInputValue: setInputValue2 } =
					handlersRef.current
				addPickedElement2(message.data.cssSelector)
				const info = [
					`[Element Picked]`,
					`Tag: ${message.data.tagName}`,
					message.data.id ? `ID: #${message.data.id}` : '',
					message.data.classList?.length ? `Classes: .${message.data.classList.join('.')}` : '',
					`Selector: ${message.data.cssSelector}`,
					`XPath: ${message.data.xpath}`,
				]
					.filter(Boolean)
					.join('\n')
				setInputValue2((prev) => (prev ? prev + '\n\n' : '') + info)
				pickingTabIdRef.current = null
				setPicking(false)
			} else if (message.type === 'ELEMENT_PICKER_STOPPED') {
				pickingTabIdRef.current = null
				setPicking(false)
			}
		}
		chrome.runtime.onMessage.addListener(onMessage)
		const onTabActivated = async (info: any) => {
			const prev = pickingTabIdRef.current
			if (prev != null && prev !== info.tabId) {
				await stopPickerOn(prev)
			}
			pickingTabIdRef.current = info.tabId
			await startPickerOn(info.tabId)
		}
		chrome.tabs.onActivated.addListener(onTabActivated)
		const onEsc = (e: any) => {
			if (e.key !== 'Escape') return
			if (pickingTabIdRef.current != null) {
				stopPickerOn(pickingTabIdRef.current)
			}
			pickingTabIdRef.current = null
			setPicking(false)
		}
		window.addEventListener('keydown', onEsc, true)
		return () => {
			chrome.runtime.onMessage.removeListener(onMessage)
			chrome.tabs.onActivated.removeListener(onTabActivated)
			window.removeEventListener('keydown', onEsc, true)
		}
	}, [picking, startPickerOn, stopPickerOn])
	useEffect(() => {
		const handler = (e: any) => {
			if (e.key === 'b' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
				e.preventDefault()
				handleElementPick()
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [handleElementPick])
	const [showScriptPicker, setShowScriptPicker] = useState(false)
	const [tipScriptList, setTipScriptList] = useState<any>([])
	const handleOpenScriptPicker = useCallback(async () => {
		const scripts = await listTipScripts()
		setTipScriptList(scripts.map((s) => ({ id: s.id, name: s.name, script: s.script })))
		setShowScriptPicker(true)
	}, [])
	const handleSelectScript = useCallback(
		(item: any) => {
			setAttachedScript({ name: item.name, content: item.script })
			setShowScriptPicker(false)
		},
		[setAttachedScript]
	)
	const [developerMode, setDeveloperMode] = useState(false)
	const [devCopied, setDevCopied] = useState(false)
	useEffect(() => {
		chrome.storage.local.get('developerMode').then((r) => {
			setDeveloperMode(!!r.developerMode)
		})
		const listener = (changes: any) => {
			if (changes.developerMode) setDeveloperMode(!!changes.developerMode.newValue)
		}
		chrome.storage.local.onChanged.addListener(listener)
		return () => chrome.storage.local.onChanged.removeListener(listener)
	}, [])
	const handleCopySession = useCallback(async () => {
		const md = exportSessionAsMarkdown(history, currentTask, modelInfo, getCurrentScript())
		await navigator.clipboard.writeText(md)
		setDevCopied(true)
		setTimeout(() => setDevCopied(false), 2e3)
	}, [history, currentTask, modelInfo, getCurrentScript])
	if (view.name === 'history') {
		return (
			<HistoryList
				onSelect={(id: any) => setView({ name: 'history-detail', sessionId: id })}
				onBack={() => setView({ name: 'chat' })}
				onRerun={runTask}
			/>
		)
	}
	if (view.name === 'history-detail') {
		return (
			<HistoryDetail
				sessionId={view.sessionId}
				onBack={() => setView({ name: 'history' })}
				onRerun={runTask}
			/>
		)
	}
	const isRunning = status === 'running'
	const showEmptyState = history.length === 0 && !isRunning
	const isScriptMode = mode === 'script'
	const isSniffMode = mode === 'sniff'
	return (
		<div className="relative flex flex-col h-screen bg-background">
			<MotionOverlay active={isRunning} />
			{tipScriptProposal && (
				<TipScriptConfirmDialog
					key={tipScriptProposal.script}
					proposal={tipScriptProposal}
					onConfirm={confirmTipScript}
					onDismiss={dismissTipScript}
				/>
			)}
			<header className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<Logo className="size-5" />
					<div className="flex rounded-md border text-[11px] overflow-hidden">
						<button
							type="button"
							onClick={() => setMode('normal')}
							className={`px-2 py-0.5 cursor-pointer transition-colors flex items-center gap-1 ${mode === 'normal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
						>
							<MousePointerClick className="size-2.5" />
							{t('panel.mode.normal')}
						</button>
						<button
							type="button"
							onClick={() => setMode('script')}
							className={`px-2 py-0.5 cursor-pointer transition-colors flex items-center gap-1 ${isScriptMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
						>
							<FileCode className="size-2.5" />
							{t('panel.mode.script')}
						</button>
						<button
							type="button"
							onClick={() => setMode('sniff')}
							className={`px-2 py-0.5 cursor-pointer transition-colors flex items-center gap-1 ${isSniffMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
						>
							<Radio className="size-2.5" />
							{t('panel.mode.sniff')}
						</button>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<StatusDot status={status} />
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => {
							newChat()
							setView({ name: 'chat' })
						}}
						className="cursor-pointer"
						title={t('panel.newChat')}
					>
						<Plus className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleMarkAndCopy}
						className="cursor-pointer"
						title={t('panel.markAndCopy')}
					>
						<CodeXml className={`size-3.5 ${markCopied ? 'text-green-500' : ''}`} />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => setView({ name: 'history' })}
						className="cursor-pointer"
					>
						<History className="size-3.5" />
					</Button>
					{developerMode && (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={handleCopySession}
							className="cursor-pointer"
							title={t('panel.copySession')}
						>
							<ClipboardList className={`size-3.5 ${devCopied ? 'text-green-500' : ''}`} />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => chrome.runtime.openOptionsPage()}
						className="cursor-pointer"
					>
						<Settings className="size-3.5" />
					</Button>
				</div>
			</header>
			{isScriptMode && modelInfo && (
				<div className="flex items-center gap-2 px-3 py-1 border-b bg-muted/30 text-[10px] text-muted-foreground">
					<span className="font-medium truncate">{modelInfo.model}</span>
					<span className="flex items-center gap-0.5">
						{modelInfo.supportsVision ? (
							<Eye className="size-2.5 text-green-500" />
						) : (
							<EyeOff className="size-2.5 text-orange-400" />
						)}
						{modelInfo.supportsVision ? t('panel.vision') : t('panel.noVision')}
					</span>
				</div>
			)}
			<main className="flex-1 overflow-hidden flex flex-col">
				{isSniffMode && <SniffView />}
				{!isSniffMode && (
					<div
						ref={historyRef}
						className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2"
					>
						{showEmptyState && <EmptyState />}
						{history.map((event: any, index: any) => {
							let finalScript = null
							if (event.type === 'step' && event.action?.name === 'done') {
								for (let i = index - 1; i >= 0; i--) {
									const prev = history[i]
									if (prev.type === 'step' && prev.action?.name === 'execute_javascript') {
										finalScript = prev.action?.input?.script ?? null
										break
									}
								}
							}
							return (
								// eslint-disable-next-line react-x/no-array-index-key
								<EventCard
									key={index}
									event={event}
									onSaveAsTipScript={openTipScriptProposal}
									finalScript={finalScript}
								/>
							)
						})}
						{activity && <ActivityCard activity={activity} />}
					</div>
				)}
			</main>
			{showScriptPicker && (
				<div
					role="button"
					tabIndex={0}
					className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
					onClick={() => setShowScriptPicker(false)}
					onKeyDown={(e) => {
						if (e.key === 'Escape') setShowScriptPicker(false)
					}}
				>
					<div
						role="dialog"
						className="bg-background border rounded-lg shadow-lg w-full max-w-xs max-h-60 flex flex-col"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between px-3 py-2 border-b">
							<span className="text-xs font-semibold">{t('panel.selectTipScript')}</span>
							<button
								type="button"
								onClick={() => setShowScriptPicker(false)}
								className="cursor-pointer"
							>
								<X className="size-3.5 text-muted-foreground hover:text-foreground" />
							</button>
						</div>
						<div className="flex-1 overflow-y-auto">
							{tipScriptList.length === 0 ? (
								<div className="p-4 text-center text-xs text-muted-foreground">
									{t('panel.noTipScripts')}
								</div>
							) : (
								tipScriptList.map((item: any) => (
									<button
										key={item.id}
										type="button"
										onClick={() => handleSelectScript(item)}
										className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 cursor-pointer truncate"
									>
										{item.name}
									</button>
								))
							)}
						</div>
					</div>
				</div>
			)}
			{!isSniffMode && (
				<footer className="border-t">
					<div className="flex items-center gap-1.5 px-3 pt-2 min-w-0">
						<Button
							variant={picking ? 'default' : 'outline'}
							size="sm"
							onClick={handleElementPick}
							title={t('panel.pickElement.shortcut')}
							className="text-[11px] h-6 px-2 cursor-pointer shrink-0"
						>
							<Crosshair className="size-3 mr-1" />
							{picking ? t('panel.picking') : t('panel.pickElement')}
						</Button>
						{isScriptMode &&
							(attachedScript ? (
								<span className="inline-flex items-center gap-1 text-[11px] h-6 px-2 rounded-md border bg-primary/10 text-primary max-w-36 min-w-0 overflow-hidden shrink">
									<BookOpen className="size-3 shrink-0" />
									<span className="truncate min-w-0" title={attachedScript.name}>
										{attachedScript.name}
									</span>
									<button
										type="button"
										onClick={() => setAttachedScript(null)}
										className="shrink-0 hover:text-destructive cursor-pointer"
									>
										<X className="size-3" />
									</button>
								</span>
							) : (
								<Button
									variant="outline"
									size="sm"
									onClick={handleOpenScriptPicker}
									className="text-[11px] h-6 px-2 cursor-pointer"
								>
									<BookOpen className="size-3 mr-1" />
									{t('panel.refScript')}
								</Button>
							))}
					</div>
					<div className="p-3 pt-2">
						<InputGroup className="relative rounded-lg">
							<InputGroupTextarea
								ref={textareaRef}
								placeholder={
									isScriptMode ? t('panel.placeholder.script') : t('panel.placeholder.normal')
								}
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								onKeyDown={handleKeyDown}
								disabled={isRunning}
								className="text-xs pr-12 min-h-10"
							/>
							<InputGroupAddon align="inline-end" className="absolute bottom-0 right-0">
								{isRunning ? (
									<InputGroupButton
										size="icon-sm"
										variant="destructive"
										onClick={handleStop}
										className="size-7"
									>
										<Square className="size-3" />
									</InputGroupButton>
								) : (
									<InputGroupButton
										size="icon-sm"
										variant="default"
										onClick={() => handleSubmit()}
										disabled={!inputValue.trim()}
										className="size-7 cursor-pointer"
									>
										<Send className="size-3" />
									</InputGroupButton>
								)}
							</InputGroupAddon>
						</InputGroup>
					</div>
				</footer>
			)}
		</div>
	)
}
