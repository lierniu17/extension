import { HatGlasses, House } from 'lucide-react'
import { siGithub } from 'simple-icons'
import { useI18n } from '@/i18n'

export function AboutSection() {
	const { t } = useI18n()
	return (
		<div className="space-y-10">
			<h2 className="text-2xl font-bold text-foreground">{t('about.title')}</h2>
			<div className="rounded-xl border p-8">
				<div className="flex items-center justify-between">
					<span className="text-base font-semibold text-foreground">{t('about.version')}</span>
					<span className="text-base font-mono text-foreground/50">v{__VERSION__}</span>
				</div>
			</div>
			<div className="rounded-xl border p-8 space-y-1">
				<a
					href="TODO_GITHUB_URL"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-muted/50 transition-colors"
				>
					<svg role="img" viewBox="0 0 24 24" className="size-5 fill-current text-foreground/70">
						<path d={siGithub.path} />
					</svg>
					<span className="text-base text-foreground">{t('about.sourceCode')}</span>
				</a>
				<a
					href="TODO_HOMEPAGE_URL"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-muted/50 transition-colors"
				>
					<House className="size-5 text-foreground/70" />
					<span className="text-base text-foreground">{t('about.homePage')}</span>
				</a>
				<a
					href="TODO_GITHUB_URL/blob/main/docs/terms-and-privacy.md"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-muted/50 transition-colors"
				>
					<HatGlasses className="size-5 text-foreground/70" />
					<span className="text-base text-foreground">{t('about.privacy')}</span>
				</a>
			</div>
			<div className="text-base text-foreground/50 text-center py-6">
				<span>
					{t('about.credits')}{' '}
					<a
						href="TODO_PERSONAL_URL"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-foreground"
					>
						@XePope
					</a>
				</span>
			</div>
		</div>
	)
}
