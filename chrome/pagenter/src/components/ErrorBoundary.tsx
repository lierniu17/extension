import { RotateCcw, Settings, TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { t } from '@/i18n'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null }

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('[ErrorBoundary]', error, errorInfo.componentStack)
	}

	handleReload = () => {
		window.location.reload()
	}

	handleOpenSettings = async () => {
		try {
			const base = chrome.runtime.getURL('options.html')
			const url = `${base}#general`
			const tabs = await chrome.tabs.query({})
			const optionsTab = tabs.find((tab) => tab.url?.split('#')[0] === base)
			if (optionsTab?.id !== undefined) {
				await chrome.tabs.update(optionsTab.id, { active: true, url })
				if (optionsTab.windowId !== undefined) {
					await chrome.windows.update(optionsTab.windowId, { focused: true })
				}
				return
			}
			await chrome.tabs.create({ url })
		} catch (err) {
			console.error('[ErrorBoundary] Failed to open settings:', err)
		}
	}

	render() {
		if (!this.state.hasError) {
			return this.props.children
		}

		const msg = this.state.error?.message
		const displayMsg =
			msg === 'LLM_CONFIG_MISSING' ? t('error.llmConfigMissing') : msg || t('error.unexpected')

		return (
			<div className="flex flex-col items-center justify-center h-screen bg-background p-6 text-center">
				<TriangleAlert className="size-12 text-destructive mb-4" />
				<h2 className="text-lg font-semibold mb-2">{t('error.title')}</h2>
				<p className="text-sm text-muted-foreground mb-4 max-w-xs">{displayMsg}</p>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={this.handleOpenSettings}>
						<Settings className="size-3.5 mr-2" />
						{t('error.openSettings')}
					</Button>
					<Button variant="outline" size="sm" onClick={this.handleReload}>
						<RotateCcw className="size-3.5 mr-2" />
						{t('error.reloadPanel')}
					</Button>
				</div>
			</div>
		)
	}
}
