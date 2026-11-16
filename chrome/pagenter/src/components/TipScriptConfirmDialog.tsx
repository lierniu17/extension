// TODO(types)
import ReactCodeMirror from '@uiw/react-codemirror'
import { useI18n } from '@/i18n'
import { Plus, Save, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function TipScriptConfirmDialog({ proposal, onConfirm, onDismiss }: any) {
	const { t } = useI18n()
	const [name, setName] = useState(proposal.name)
	const [description, setDescription] = useState(proposal.description)
	const [script, setScript] = useState(proposal.script)
	const [urlPatterns, setUrlPatterns] = useState(proposal.urlPatterns)
	const [triggerMode, setTriggerMode] = useState(proposal.triggerMode)
	const isDark = document.documentElement.classList.contains('dark')
	const handleConfirm = () => {
		onConfirm({ name, description, script, urlPatterns, triggerMode })
	}
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-background border rounded-xl shadow-2xl w-[95%] max-w-lg max-h-[90vh] flex flex-col">
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<h3 className="text-sm font-semibold">{t('tipScript.dialog.title')}</h3>
					<button
						type="button"
						onClick={onDismiss}
						className="text-muted-foreground hover:text-foreground cursor-pointer"
					>
						<X className="size-4" />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
					<div className="space-y-1">
						<label className="text-xs font-medium text-foreground">
							{t('tipScript.dialog.name')}
						</label>
						<Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-foreground">
							{t('tipScript.dialog.description')}
						</label>
						<Input
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="h-8 text-sm"
						/>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-foreground">
							{t('tipScript.dialog.script')}
						</label>
						<div className="rounded-lg border overflow-hidden">
							<ReactCodeMirror
								value={script}
								onChange={setScript}
								extensions={[javascript()]}
								theme={isDark ? oneDark : void 0}
								height="200px"
								basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
							/>
						</div>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-foreground">
							{t('tipScript.dialog.urlPatterns')}
						</label>
						{urlPatterns.map((pattern: any, idx: any) => (
							<div key={idx} className="flex gap-1.5 items-center">
								<Input
									value={pattern}
									onChange={(e) => {
										const next = [...urlPatterns]
										next[idx] = e.target.value
										setUrlPatterns(next)
									}}
									className="h-7 text-xs font-mono"
									placeholder="*://example.com/*"
								/>
								{urlPatterns.length > 1 && (
									<button
										type="button"
										onClick={() => setUrlPatterns(urlPatterns.filter((_: any, i: any) => i !== idx))}
										className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
									>
										<X className="size-3.5" />
									</button>
								)}
							</div>
						))}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setUrlPatterns([...urlPatterns, ''])}
							className="text-xs h-6 cursor-pointer"
						>
							<Plus className="size-3 mr-1" />
							{t('tipScript.dialog.addPattern')}
						</Button>
					</div>
					<div className="space-y-1">
						<label className="text-xs font-medium text-foreground">
							{t('tipScript.dialog.triggerMode')}
						</label>
						<select
							value={triggerMode}
							onChange={(e) => setTriggerMode(e.target.value)}
							className="w-full h-8 text-sm rounded-lg border border-input bg-background px-2 cursor-pointer"
						>
							<option value="manual">{t('tipScript.dialog.triggerMode.manual')}</option>
							<option value="auto">{t('tipScript.dialog.triggerMode.auto')}</option>
						</select>
					</div>
				</div>
				<div className="flex justify-end gap-2 px-4 py-3 border-t">
					<Button variant="outline" size="sm" onClick={onDismiss} className="cursor-pointer">
						{t('tipScript.dialog.cancel')}
					</Button>
					<Button
						size="sm"
						onClick={handleConfirm}
						disabled={!name || !script}
						className="cursor-pointer"
					>
						<Save className="size-3.5 mr-1.5" />
						{t('tipScript.dialog.save')}
					</Button>
				</div>
			</div>
		</div>
	)
}
