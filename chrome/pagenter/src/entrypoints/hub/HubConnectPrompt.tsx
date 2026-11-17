import { Plug } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

/**
 * The Hub was opened with a port (e.g. by a localhost launcher page via OPEN_HUB):
 * show it and connect only when the user clicks Connect.
 */
export function HubConnectPrompt({ port, onConnect }: { port: number; onConnect: () => void }) {
	const { t } = useI18n()
	return (
		<div className="flex items-center gap-2 text-xs text-muted-foreground">
			<Plug className="size-3.5" />
			<span>{t('hub.ws.pending', { port })}</span>
			<Button type="button" size="sm" onClick={onConnect} className="h-7 text-xs">
				{t('hub.ws.connect')}
			</Button>
		</div>
	)
}
