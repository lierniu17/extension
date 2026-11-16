// TODO(types)
import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n'

export function HubSection({ onSettingsChanged }: any) {
	const { t } = useI18n()
	const [allowAll, setAllowAll] = useState<any>(false)
	useEffect(() => {
		chrome.storage.local.get('allowAllHubConnection').then((r) => {
			setAllowAll(r.allowAllHubConnection === true)
		})
	}, [])
	const toggle = (checked: any) => {
		setAllowAll(checked)
		chrome.storage.local.set({ allowAllHubConnection: checked })
		onSettingsChanged?.()
	}
	return (
		<div className="space-y-10">
			<h2 className="text-2xl font-bold text-foreground">{t('hub.title')}</h2>
			<div className="rounded-xl border p-8 space-y-5">
				<label
					className={`flex items-center justify-between p-5 rounded-lg border cursor-pointer transition-colors ${allowAll ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400' : 'bg-muted/30 text-foreground'}`}
				>
					<span className="text-base font-semibold">{t('hub.autoApprove')}</span>
					<Switch
						checked={allowAll}
						onCheckedChange={toggle}
						className={allowAll ? 'data-[state=checked]:bg-amber-500' : ''}
					/>
				</label>
				<p className="text-sm text-foreground/50 leading-relaxed">
					{t('hub.autoApprove.desc')}
					<br />
					<span className="font-bold text-foreground/70">{t('hub.autoApprove.caution')}</span>
				</p>
			</div>
			<div className="rounded-xl border p-8 space-y-4">
				<div>
					<label className="text-base font-semibold text-foreground">{t('hub.manage')}</label>
					<p className="text-sm text-foreground/50 mt-1">{t('hub.manage.desc')}</p>
				</div>
				<a
					href={chrome.runtime.getURL('hub.html')}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-base font-medium text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-colors"
				>
					{t('hub.manage')}
					<ExternalLink className="size-4" />
				</a>
			</div>
		</div>
	)
}
