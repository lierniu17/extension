import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { en } from './locales/en'
import { zhCN } from './locales/zh-CN'

export type Locale = 'en' | 'zh-CN'

type Params = Record<string, string | number>

const locales: Record<Locale, Record<string, string>> = {
	en,
	'zh-CN': zhCN,
}

function detectLocale(): Locale {
	const lang = navigator.language
	if (lang.startsWith('zh')) return 'zh-CN'
	return 'en'
}

function translate(locale: Locale, key: string, params?: Params): string {
	let text = locales[locale]?.[key] ?? locales.en[key] ?? key
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			text = text.replace(`{${k}}`, v as string)
		}
	}
	return text
}

/** The locale the UI uses: the user's choice in storage, else the system language. */
async function getEffectiveLocale(): Promise<Locale> {
	try {
		const { uiLanguage } = await chrome.storage.local.get('uiLanguage')
		if (uiLanguage === 'en' || uiLanguage === 'zh-CN') return uiLanguage
	} catch {}
	return detectLocale()
}

/** Translate outside React (honours the stored UI language). */
export async function tAsync(key: string, params?: Params): Promise<string> {
	return translate(await getEffectiveLocale(), key, params)
}

interface I18nContextValue {
	locale: Locale
	setLocale: (locale: Locale | undefined) => void
	t: (key: string, params?: Params) => string
	userLocale: Locale | undefined
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
	const [userLocale, setUserLocaleState] = useState<Locale | undefined>(undefined)
	const [systemLocale] = useState(detectLocale)

	useEffect(() => {
		chrome.storage.local.get('uiLanguage').then((result) => {
			if (result.uiLanguage) {
				setUserLocaleState(result.uiLanguage as Locale)
			}
		})
	}, [])

	const locale = userLocale ?? systemLocale

	const setLocale = useCallback((newLocale: Locale | undefined) => {
		setUserLocaleState(newLocale)
		if (newLocale) {
			chrome.storage.local.set({ uiLanguage: newLocale })
		} else {
			chrome.storage.local.remove('uiLanguage')
		}
	}, [])

	const t = useCallback((key: string, params?: Params) => translate(locale, key, params), [locale])

	return React.createElement(
		I18nContext.Provider,
		{ value: { locale, setLocale, t, userLocale } },
		children
	)
}

export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext)
	if (!ctx) throw new Error('useI18n must be used within I18nProvider')
	return ctx
}

/** Translate outside React with the system language (no storage access). */
export function t(key: string, params?: Params): string {
	return translate(detectLocale(), key, params)
}
