// TODO(types)
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import ReactCodeMirror from '@uiw/react-codemirror'
import {
	BookmarkPlus,
	CircleCheckBig,
	CircleX,
	Eye,
	Globe,
	Keyboard,
	Mouse,
	MoveVertical,
	RefreshCw,
	Sparkles,
	User,
	Zap,
} from 'lucide-react'
import { useState } from 'react'

import type { AgentActivity, HistoricalEvent } from '@/core/types'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

function ResultCard({ success, text, finalScript, children }: any) {
	return (
		<div
			className={cn(
				'min-w-0 max-w-full rounded-lg border p-3',
				success ? 'border-green-500/30 bg-green-500/10' : 'border-destructive/30 bg-destructive/10'
			)}
		>
			<div className="flex items-center justify-between gap-2 mb-2 min-w-0">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					{success ? (
						<CircleCheckBig className="size-3.5 text-green-500" />
					) : (
						<CircleX className="size-3.5 text-destructive" />
					)}
					<span
						className={cn(
							'text-xs font-medium',
							success ? 'text-green-600 dark:text-green-400' : 'text-destructive'
						)}
					>
						{'Result: '}
						{success ? 'Success' : 'Failed'}
					</span>
				</div>
				{finalScript && <CopyButton text={finalScript} label="Copy Final Script" />}
			</div>
			<p className="text-[12px] text-foreground pl-5 min-w-0 max-w-full whitespace-pre-wrap wrap-anywhere break-all">
				{text}
			</p>
			{children}
		</div>
	)
}

function ReflectionItem({ icon, value }: any) {
	const [expanded, setExpanded] = useState(false)
	return (
		<>
			<span className="text-xs flex justify-center">{icon}</span>
			<span
				className={cn(
					'text-[11px] text-muted-foreground cursor-pointer hover:text-muted-foreground/70',
					!expanded && 'line-clamp-1'
				)}
				onClick={() => setExpanded(!expanded)}
			>
				{value}
			</span>
		</>
	)
}

function ReflectionSection({ reflection }: any) {
	const joinList = (arr: any) => (arr && arr.length > 0 ? arr.join('; ') : void 0)
	const goalLine =
		reflection.goal_status && reflection.goal_status !== 'on_track'
			? `[${reflection.goal_status}]${reflection.active_goal ? ` ${reflection.active_goal}` : ''}`
			: void 0
	const items = [
		{ icon: '✅', label: 'progress', value: joinList(reflection.progress) },
		{ icon: '📝', label: 'pending', value: joinList(reflection.pending) },
		{ icon: '🔖', label: 'evidence', value: joinList(reflection.evidence) },
		{ icon: '💭', label: 'reasoning', value: reflection.reasoning || void 0 },
		{ icon: '🎯', label: 'goal', value: goalLine },
	].filter((item) => item.value)
	if (items.length === 0) return null
	return (
		<div className="mb-2">
			<div className="grid grid-cols-[14px_1fr] gap-x-2 gap-y-2">
				{items.map((item) => (
					<ReflectionItem key={item.label} icon={item.icon} value={item.value} />
				))}
			</div>
		</div>
	)
}

function ActionIcon({ name, className }: any) {
	const icons: Record<string, React.ReactNode> = {
		click_element: <Mouse className={className} />,
		input: <Keyboard className={className} />,
		scroll: <MoveVertical className={className} />,
		go_to_url: <Globe className={className} />,
	}
	return icons[name] || <Zap className={className} />
}

function CopyButton({ text, label }: any) {
	const [copied, setCopied] = useState(false)
	return (
		<button
			type="button"
			onClick={() => {
				navigator.clipboard.writeText(text)
				setCopied(true)
				setTimeout(() => setCopied(false), 1500)
			}}
			className="text-[9px] text-muted-foreground hover:text-foreground transition-colors border px-1 rounded shrink-0 cursor-pointer backdrop-blur-xs"
		>
			{copied ? 'Copied!' : label}
		</button>
	)
}

function extractPrompt(rawRequest: any, role: any) {
	const messages = rawRequest?.messages
	if (!messages) return null
	const msg =
		role === 'system'
			? messages.find((m: any) => m.role === role)
			: messages.findLast((m: any) => m.role === role)
	if (!msg?.content) return null
	return typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)
}

function RawSection({ rawRequest, rawResponse }: any) {
	const [activeTab, setActiveTab] = useState<any>(null)
	if (!rawRequest && !rawResponse) return null
	const handleTabClick = (tab: any) => {
		setActiveTab(activeTab === tab ? null : tab)
	}
	const content =
		activeTab === 'request' ? rawRequest : activeTab === 'response' ? rawResponse : null
	const systemPrompt = activeTab === 'request' ? extractPrompt(rawRequest, 'system') : null
	const userPrompt = activeTab === 'request' ? extractPrompt(rawRequest, 'user') : null
	return (
		<div className="mt-2 border-t border-dashed pt-2">
			<div className="flex items-center gap-3 -my-1">
				{rawRequest != null && (
					<button
						type="button"
						onClick={() => handleTabClick('request')}
						className={cn(
							'text-[10px] mt-0.5 transition-colors border-b cursor-pointer',
							activeTab === 'request'
								? 'text-foreground border-foreground'
								: 'text-muted-foreground border-transparent hover:text-foreground'
						)}
					>
						Raw Request
					</button>
				)}
				{rawResponse != null && (
					<button
						type="button"
						onClick={() => handleTabClick('response')}
						className={cn(
							'text-[10px] mt-0.5 transition-colors border-b cursor-pointer',
							activeTab === 'response'
								? 'text-foreground border-foreground'
								: 'text-muted-foreground border-transparent hover:text-foreground'
						)}
					>
						Raw Response
					</button>
				)}
			</div>
			{content != null && (
				<div className="relative mt-1.5">
					<div className="absolute top-1 right-1 flex gap-1">
						{systemPrompt && <CopyButton text={systemPrompt} label="Copy System" />}
						{userPrompt && <CopyButton text={userPrompt} label="Copy User" />}
						<CopyButton text={JSON.stringify(content, null, 4)} label="Copy" />
					</div>
					<pre className="p-2 pt-5 text-[10px] text-foreground/70 bg-muted rounded overflow-x-auto max-h-60 overflow-y-auto">
						{JSON.stringify(content, null, 4)}
					</pre>
				</div>
			)}
		</div>
	)
}

function ScriptViewer({ code }: any) {
	const [expanded, setExpanded] = useState(false)
	const isDark = document.documentElement.classList.contains('dark')
	if (!expanded) {
		return (
			<button
				type="button"
				onClick={() => setExpanded(true)}
				className="mt-1 text-[10px] text-muted-foreground hover:text-foreground border px-1.5 py-0.5 rounded cursor-pointer"
			>
				Show Script
			</button>
		)
	}
	return (
		<div className="mt-1.5 rounded-md border overflow-hidden">
			<div className="flex items-center justify-between px-2 py-1 bg-muted/60 border-b">
				<span className="text-[10px] text-muted-foreground">JavaScript</span>
				<div className="flex gap-1">
					<CopyButton text={code} label="Copy" />
					<button
						type="button"
						onClick={() => setExpanded(false)}
						className="text-[9px] text-muted-foreground hover:text-foreground cursor-pointer"
					>
						Hide
					</button>
				</div>
			</div>
			<ReactCodeMirror
				value={code}
				extensions={[javascript()]}
				theme={isDark ? oneDark : void 0}
				height="auto"
				maxHeight="200px"
				readOnly={true}
				editable={false}
				basicSetup={{
					lineNumbers: true,
					foldGutter: false,
					highlightActiveLine: false,
				}}
			/>
		</div>
	)
}

function formatDuration(ms: any) {
	if (ms < 1e3) return `${ms}ms`
	return `${(ms / 1e3).toFixed(1)}s`
}

function formatTime(iso: any) {
	try {
		return new Date(iso).toLocaleTimeString()
	} catch {
		return iso
	}
}

function StepCard({ event, onSaveAsTipScript }: any) {
	const { t: t } = useI18n()
	const scriptActions = ['execute_javascript', 'save_as_tipscript']
	const hasScript = event.action && scriptActions.includes(event.action.name)
	const scriptCode = hasScript ? event.action.input?.script : null
	return (
		<div className="min-w-0 max-w-full rounded-lg border-l-2 border-l-blue-500/50 border bg-muted/40 p-2.5">
			<div className="flex items-center justify-between mb-2">
				<span className="text-[11px] font-semibold text-foreground tracking-wide">
					{t('step.title', { number: String(event.stepIndex + 1) })}
				</span>
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					{event.startedAt && <span>{formatTime(event.startedAt)}</span>}
					{event.llmDurationMs != null && (
						<span title={t('step.llmTime')}>
							{'🧠 '}
							{formatDuration(event.llmDurationMs)}
						</span>
					)}
					{event.toolDurationMs != null && (
						<span title={t('step.toolTime')}>
							{'⚡ '}
							{formatDuration(event.toolDurationMs)}
						</span>
					)}
				</div>
			</div>
			{event.reflection && <ReflectionSection reflection={event.reflection} />}
			{event.action && (
				<div>
					<div className="text-[11px] font-semibold text-foreground tracking-wide mb-1">
						Actions
					</div>
					<div className="flex items-start gap-2">
						<ActionIcon
							name={event.action.name}
							className="size-3.5 text-blue-500 shrink-0 mt-0.5"
						/>
						<div className="flex-1 min-w-0">
							<p className="text-xs text-foreground/80 mb-0.5 wrap-anywhere break-all line-clamp-1 hover:line-clamp-none">
								<span className="font-medium text-foreground/70">{event.action.name}</span>
								{event.action.name !== 'done' && !hasScript && (
									<span className="text-muted-foreground/70 ml-1.5">
										{JSON.stringify(event.action.input)}
									</span>
								)}
							</p>
							<p className="text-[11px] text-muted-foreground/70 grid grid-cols-[auto_1fr] gap-1.5">
								<span className="">└</span>
								<span className="wrap-anywhere break-all line-clamp-1 hover:line-clamp-3">
									{event.action.output}
								</span>
							</p>
							{scriptCode && <ScriptViewer code={scriptCode} />}
							{event.action.name === 'save_as_tipscript' && onSaveAsTipScript && (
								<button
									type="button"
									onClick={() => {
										const input = event.action.input
										onSaveAsTipScript({
											name: input?.name || '',
											description: input?.description || '',
											script: input?.script || '',
											urlPatterns: input?.urlPatterns || ['*://*/*'],
											triggerMode: input?.triggerMode || 'manual',
										})
									}}
									className="mt-1.5 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 cursor-pointer transition-colors"
								>
									<BookmarkPlus className="size-3" />
									{t('step.saveAsTipScript')}
								</button>
							)}
						</div>
					</div>
				</div>
			)}
			<RawSection rawRequest={event.rawRequest} rawResponse={event.rawResponse} />
		</div>
	)
}

function ObservationCard({ event }: any) {
	return (
		<div className="min-w-0 max-w-full rounded-lg border-l-2 border-l-green-500/50 border bg-muted/40 p-2.5">
			<div className="flex min-w-0 items-start gap-2">
				<Eye className="size-3.5 text-green-500 shrink-0 mt-0.5" />
				<span className="min-w-0 flex-1 text-[11px] text-muted-foreground wrap-anywhere break-all">
					{event.content}
				</span>
			</div>
		</div>
	)
}

function RetryCard({ event }: any) {
	return (
		<div className="min-w-0 max-w-full rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
			<div className="flex min-w-0 items-start gap-1.5">
				<RefreshCw className="size-3 text-amber-500 shrink-0 mt-0.5" />
				<span className="min-w-0 flex-1 text-xs wrap-anywhere break-all text-amber-600 dark:text-amber-400">
					{event.message}
					{' ('}
					{event.attempt}/{event.maxAttempts})
				</span>
			</div>
		</div>
	)
}

function ErrorCard({ event }: any) {
	return (
		<div className="min-w-0 max-w-full rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
			<div className="flex min-w-0 items-start gap-1.5">
				<CircleX className="size-3 text-destructive shrink-0 mt-0.5" />
				<span className="min-w-0 flex-1 text-xs wrap-anywhere break-all text-destructive">
					{event.message}
				</span>
			</div>
			<RawSection rawResponse={event.rawResponse} />
		</div>
	)
}

function UserMessageCard({ event }: any) {
	return (
		<div className="flex min-w-0 items-start gap-2 justify-end">
			<div className="min-w-0 max-w-[85%] rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
				<p className="text-xs font-medium whitespace-pre-wrap wrap-anywhere break-all">
					{event.content}
				</p>
			</div>
			<div className="shrink-0 size-6 rounded-full bg-primary/15 flex items-center justify-center mt-0.5">
				<User className="size-3 text-primary" />
			</div>
		</div>
	)
}

export function EventCard({ event, onSaveAsTipScript, finalScript }: any) {
	if (event.type === 'step' && event.action?.name === 'done') {
		const input = event.action.input
		return (
			<>
				<StepCard event={event} onSaveAsTipScript={onSaveAsTipScript} />
				<ResultCard
					success={input?.success ?? true}
					text={input?.text || event.action.output || ''}
					finalScript={finalScript}
				/>
			</>
		)
	}
	if (event.type === 'step') {
		return <StepCard event={event} onSaveAsTipScript={onSaveAsTipScript} />
	}
	if (event.type === 'user_message') {
		return <UserMessageCard event={event} />
	}
	if (event.type === 'observation') {
		return <ObservationCard event={event} />
	}
	if (event.type === 'retry') {
		return <RetryCard event={event} />
	}
	if (event.type === 'error') {
		return <ErrorCard event={event} />
	}
	return null
}

export function ActivityCard({ activity }: any) {
	const { t: t } = useI18n()
	const getActivityInfo = () => {
		switch (activity.type) {
			case 'thinking':
				return { text: t('activity.thinking'), color: 'text-blue-500' }
			case 'executing':
				return { text: t('activity.executing', { tool: activity.tool }), color: 'text-amber-500' }
			case 'executed':
				return { text: t('activity.done', { tool: activity.tool }), color: 'text-green-500' }
			case 'retrying':
				return {
					text: t('activity.retrying', {
						attempt: String(activity.attempt),
						maxAttempts: String(activity.maxAttempts),
					}),
					color: 'text-amber-500',
				}
			case 'error':
				return { text: activity.message, color: 'text-destructive' }
		}
	}
	const info = getActivityInfo()!
	return (
		<div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/40 p-2.5 animate-pulse">
			<div className="relative">
				<Sparkles className={cn('size-3.5', info.color)} />
				<span
					className={cn(
						'absolute -top-0.5 -right-0.5 size-1.5 rounded-full animate-ping',
						activity.type === 'thinking'
							? 'bg-blue-500'
							: activity.type === 'executing'
								? 'bg-amber-500'
								: activity.type === 'retrying'
									? 'bg-amber-500'
									: activity.type === 'error'
										? 'bg-destructive'
										: 'bg-green-500'
					)}
				/>
			</div>
			<span className={cn('min-w-0 flex-1 text-xs wrap-anywhere break-all', info.color)}>
				{info.text}
			</span>
		</div>
	)
}
