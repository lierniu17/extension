// TODO(types)
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { deleteSession, getSession } from '@/lib/db'

import { EventCard } from './cards'

export function HistoryDetail({ sessionId, onBack, onRerun }: any) {
	const [session, setSession] = useState<any>(null)
	useEffect(() => {
		getSession(sessionId).then((s) => setSession(s ?? null))
	}, [sessionId])
	if (!session) {
		return (
			<div className="flex items-center justify-center h-screen text-xs text-muted-foreground">
				Loading...
			</div>
		)
	}
	return (
		<div className="flex flex-col h-screen bg-background">
			<header className="flex items-center gap-2 border-b px-3 py-2">
				<Button variant="ghost" size="icon-sm" onClick={onBack} className="cursor-pointer">
					<ArrowLeft className="size-3.5" />
				</Button>
				<span className="text-sm font-medium truncate">History</span>
			</header>
			<div className="border-b px-3 py-2 bg-muted/30">
				<div className="text-[10px] text-muted-foreground uppercase tracking-wide">Task</div>
				<div className="text-xs font-medium wrap-anywhere break-all" title={session.task}>
					{session.task}
				</div>
				<div className="mt-2 flex items-center gap-2">
					<button
						type="button"
						onClick={() => onRerun(session.task)}
						className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RotateCcw className="size-3" />
						Run again
					</button>
					<button
						type="button"
						onClick={async () => {
							await deleteSession(sessionId)
							onBack()
						}}
						className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
					>
						<Trash2 className="size-3" />
						Delete
					</button>
				</div>
			</div>
			<div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2">
				{session.history.map((event: any, index: any) => (
					// eslint-disable-next-line react-x/no-array-index-key
					<EventCard key={index} event={event} />
				))}
			</div>
		</div>
	)
}
