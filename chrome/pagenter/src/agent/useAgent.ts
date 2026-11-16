// TODO(types)
import { useCallback, useEffect, useRef, useState } from 'react'

import { getSession, saveSession, saveTipScript, updateSession } from '@/lib/db'

import { MultiPageAgent } from './MultiPageAgent'
import { ScriptModeAgent } from './ScriptModeAgent'
import { DEFAULT_SYSTEM_INSTRUCTION, resolveLlmConfig } from './constants'

export const AGENT_SESSION_SYNC = 'AGENT_SESSION_SYNC'

export function postAgentSessionSync(payload: any) {
	chrome.runtime.sendMessage({ type: AGENT_SESSION_SYNC, ...payload }).catch(() => {})
}

export const AGENT_STOP = 'AGENT_STOP'

export function postAgentStop(payload: any) {
	chrome.runtime.sendMessage({ type: AGENT_STOP, ...payload }).catch(() => {})
}

export function useAgent() {
	const agentRef = useRef<any>(null)
	const [status, setStatus] = useState('idle')
	const [history, setHistory] = useState<any>([])
	const [activity, setActivity] = useState<any>(null)
	const [currentTask, setCurrentTask] = useState('')
	const [sessionId, setSessionId] = useState<any>(null)
	const [config, setConfig] = useState<any>(null)
	const [mode, setMode] = useState('normal')
	const modelInfo = config?.model
		? {
				model: config.model,
				supportsVision: config.supportsVision === true,
				contextLength: config.contextLength,
			}
		: null
	const [sessionHistory, setSessionHistory] = useState<any>([])
	const sessionHistoryRef = useRef<any>([])
	useEffect(() => {
		sessionHistoryRef.current = sessionHistory
	}, [sessionHistory])
	const [tipScriptProposal, setTipScriptProposal] = useState<any>(null)
	const [attachedScript, setAttachedScript] = useState<any>(null)
	const attachedScriptRef = useRef<any>(null)
	useEffect(() => {
		attachedScriptRef.current = attachedScript
	}, [attachedScript])
	const saveTimerRef = useRef<any>(null)
	const instanceIdRef = useRef(crypto.randomUUID())
	const isLeaderRef = useRef(false)
	const syncSnapshotRef = useRef({
		sessionId: null,
		currentTask: '',
		history: [],
		status: 'idle',
		activity: null,
	})
	useEffect(() => {
		syncSnapshotRef.current = { sessionId, currentTask, history, status, activity }
	}, [sessionId, currentTask, history, status, activity])
	const broadcastSessionSync = useCallback((overrides: any) => {
		if (!isLeaderRef.current) return
		const s = { ...syncSnapshotRef.current, ...overrides }
		if (!s.sessionId) return
		postAgentSessionSync({
			instanceId: instanceIdRef.current,
			sessionId: s.sessionId,
			task: s.currentTask,
			history: s.history,
			status: s.status,
			activity: s.activity,
		})
	}, [])
	const broadcastRef = useRef(broadcastSessionSync)
	const scheduleIncrementalSave = useCallback((sid: any, task: any, hist: any, st: any) => {
		if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
		saveTimerRef.current = window.setTimeout(() => {
			updateSession(sid, { task, history: hist, status: st }).catch((err) =>
				console.error('[useAgent] incremental save failed:', err)
			)
		}, 1e3)
	}, [])
	useEffect(() => {
		chrome.storage.local.get('lastSessionId').then(async (result) => {
			const lastId = result.lastSessionId
			if (!lastId) return
			const session = await getSession(lastId)
			if (!session) return
			setSessionId(session.id)
			setCurrentTask(session.task)
			setSessionHistory(session.history)
			setHistory(session.history)
			if (session.status === 'completed' || session.status === 'error') {
				setStatus(session.status)
			}
		})
	}, [])
	useEffect(() => {
		const onMessage = (msg: any) => {
			if (msg?.type !== AGENT_SESSION_SYNC) return
			if (msg.instanceId === instanceIdRef.current) return
			if (isLeaderRef.current) return
			setSessionId(msg.sessionId)
			setCurrentTask(msg.task)
			setSessionHistory(msg.history)
			setHistory(msg.history)
			setStatus(msg.status)
			setActivity(msg.activity ?? null)
			if (msg.status === 'running') {
				window.dispatchEvent(new CustomEvent('pagenter:session-sync'))
			}
		}
		chrome.runtime.onMessage.addListener(onMessage)
		return () => chrome.runtime.onMessage.removeListener(onMessage)
	}, [])
	useEffect(() => {
		const onStop = (msg: any) => {
			if (msg?.type !== AGENT_STOP) return
			if (msg.instanceId === instanceIdRef.current) return
			if (!isLeaderRef.current) return
			if (msg.sessionId && msg.sessionId !== syncSnapshotRef.current.sessionId) return
			agentRef.current?.stop()
		}
		chrome.runtime.onMessage.addListener(onStop)
		return () => chrome.runtime.onMessage.removeListener(onStop)
	}, [])
	useEffect(() => {
		chrome.storage.local.get(['llmConfig', 'language', 'advancedConfig']).then((result) => {
			const llmConfig = resolveLlmConfig(result.llmConfig)
			const language = result.language || 'zh-CN'
			const stored = result.advancedConfig ?? {}
			const advancedConfig = {
				systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
				...stored,
			}
			setConfig({ ...llmConfig, ...advancedConfig, language: language })
		})
	}, [])
	useEffect(() => {
		if (!config) return
		if (mode === 'sniff') {
			agentRef.current = null
			queueMicrotask(() => {
				setStatus('idle')
				setActivity(null)
			})
			return
		}
		const { systemInstruction, ...agentConfig } = config
		const agentOpts = {
			...agentConfig,
			instructions: systemInstruction ? { system: systemInstruction } : void 0,
		}
		const agent = mode === 'script' ? new ScriptModeAgent(agentOpts) : new MultiPageAgent(agentOpts)
		agentRef.current = agent
		const handleStatusChange = () => {
			const newStatus = agent.status
			const cleared = newStatus === 'idle' || newStatus === 'completed' || newStatus === 'error'
			setStatus(newStatus)
			if (cleared) {
				setActivity(null)
				isLeaderRef.current = false
			}
			broadcastRef.current({
				status: newStatus,
				activity: cleared ? null : syncSnapshotRef.current.activity,
			})
		}
		const handleHistoryChange = () => {
			const nextHistory = [...agent.history]
			setHistory(nextHistory)
			broadcastRef.current({ history: nextHistory })
		}
		const handleActivity = (e: any) => {
			const newActivity = e.detail
			setActivity(newActivity)
			broadcastRef.current({ activity: newActivity })
		}
		const handleProposal = (e: any) => {
			setTipScriptProposal(e.detail)
		}
		agent.addEventListener('statuschange', handleStatusChange)
		agent.addEventListener('historychange', handleHistoryChange)
		agent.addEventListener('activity', handleActivity)
		agent.addEventListener('tipscript_proposal', handleProposal)
		return () => {
			agent.removeEventListener('statuschange', handleStatusChange)
			agent.removeEventListener('historychange', handleHistoryChange)
			agent.removeEventListener('activity', handleActivity)
			agent.removeEventListener('tipscript_proposal', handleProposal)
			agent.dispose()
		}
	}, [config, mode])
	const prevStatusRef = useRef(status)
	useEffect(() => {
		const prev = prevStatusRef.current
		prevStatusRef.current = status
		if (prev === 'running' && (status === 'completed' || status === 'error')) {
			const agent = agentRef.current
			if (!agent) return
			setSessionHistory([...agent.history])
		}
	}, [status])
	const execute = useCallback(
		async (task: any) => {
			const agent = agentRef.current
			console.log('[useAgent] start executing task:', task)
			if (!agent) throw new Error('Agent not initialized')
			isLeaderRef.current = true
			setCurrentTask(task)
			setStatus('running')
			const userMsg = { type: 'user_message', content: task }
			const initialHistory = [...sessionHistoryRef.current, userMsg]
			setSessionHistory(initialHistory)
			setHistory(initialHistory)
			let activeSessionId = sessionId
			if (!sessionId) {
				const record = await saveSession({ task, history: initialHistory, status: 'running' })
				activeSessionId = record.id
				setSessionId(record.id)
				await chrome.storage.local.set({ lastSessionId: record.id })
			} else {
				await updateSession(sessionId, { task, status: 'running' })
			}
			broadcastSessionSync({
				sessionId: activeSessionId,
				currentTask: task,
				history: initialHistory,
				status: 'running',
				activity: null,
			})
			const execOpts: any = {
				initialHistory,
			}
			if (attachedScriptRef.current) {
				execOpts.attachedScript = attachedScriptRef.current
			}
			try {
				return await agent.execute(task, execOpts)
			} catch (err) {
				isLeaderRef.current = false
				throw err
			}
		},
		[sessionId, broadcastSessionSync]
	)
	useEffect(() => {
		if (!sessionId || !currentTask || history.length === 0) return
		scheduleIncrementalSave(sessionId, currentTask, history, status)
	}, [history, status, sessionId, currentTask, scheduleIncrementalSave])
	const stop = useCallback(() => {
		agentRef.current?.stop()
		setActivity(null)
		setStatus((prev) => (prev === 'running' ? 'idle' : prev))
		isLeaderRef.current = false
		postAgentStop({
			instanceId: instanceIdRef.current,
			sessionId: syncSnapshotRef.current.sessionId,
		})
	}, [])
	const newChat = useCallback(() => {
		agentRef.current?.stop()
		setSessionHistory([])
		sessionHistoryRef.current = []
		setCurrentTask('')
		setHistory([])
		setActivity(null)
		setStatus('idle')
		setSessionId(null)
		setAttachedScript(null)
	}, [])
	const addPickedElement = useCallback((selector: any) => {
		const agent = agentRef.current
		if (agent && 'addPickedSelector' in agent) {
			agent.addPickedSelector(selector)
		}
	}, [])
	const confirmTipScript = useCallback(async (edited: any) => {
		await saveTipScript({
			name: edited.name,
			description: edited.description,
			script: edited.script,
			urlPatterns: edited.urlPatterns,
			triggerMode: edited.triggerMode,
			enabled: true,
		})
		setTipScriptProposal(null)
	}, [])
	const openTipScriptProposal = useCallback((proposal: any) => {
		setTipScriptProposal(proposal)
	}, [])
	const dismissTipScript = useCallback(() => {
		setTipScriptProposal(null)
	}, [])
	const configure = useCallback(
		async ({
			language: language,
			maxSteps,
			systemInstruction,
			experimentalLlmsTxt,
			experimentalIncludeAllTabs,
			disableNamedToolChoice,
			scriptInPromptStrategy,
			autoExecDelaySec,
			...llmConfig
		}: any) => {
			await chrome.storage.local.set({ llmConfig })
			if (language) {
				await chrome.storage.local.set({ language: language })
			} else {
				await chrome.storage.local.remove('language')
			}
			const advancedConfig = {
				maxSteps,
				systemInstruction,
				experimentalLlmsTxt,
				experimentalIncludeAllTabs,
				disableNamedToolChoice,
				scriptInPromptStrategy,
				autoExecDelaySec,
			}
			await chrome.storage.local.set({ advancedConfig })
			setConfig({ ...llmConfig, ...advancedConfig, language: language })
		},
		[]
	)
	const getCurrentScript = useCallback(() => {
		return agentRef.current?.currentScript ?? null
	}, [])
	return {
		status,
		history,
		activity,
		currentTask,
		sessionId,
		config,
		mode,
		setMode,
		modelInfo,
		execute,
		stop,
		configure,
		newChat,
		addPickedElement,
		tipScriptProposal,
		openTipScriptProposal,
		confirmTipScript,
		dismissTipScript,
		attachedScript,
		setAttachedScript,
		getCurrentScript,
	}
}
