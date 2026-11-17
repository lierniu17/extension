import { useI18n } from '@/i18n'

/**
 * Shown in the project detail when the project has no origin patterns: such a
 * project matches no site, so its APIs are not available through the page bridge.
 */
export function EmptyOriginHint({ originPatterns }: { originPatterns: readonly string[] }) {
	const { t } = useI18n()
	if (originPatterns.length > 0) return null
	return (
		<div
			role="status"
			className="mx-3 mt-2 p-2.5 rounded-md border text-xs leading-relaxed bg-amber-500/10 border-amber-500/30 text-amber-600"
		>
			{t('sniff.project.noOrigin')}
		</div>
	)
}
