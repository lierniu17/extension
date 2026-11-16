// TODO(types)
import { getApi, getLatestSpecByApi, listApisByProject, listProjects, listSamplesByApi } from '@/lib/sniff/db'
import { useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 1e3

export function useProjectList() {
	const [projects, setProjects] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [seed, setSeed] = useState(0)
	useEffect(() => {
		let cancelled = false
		const load = async () => {
			const rows = await listProjects()
			if (!cancelled) {
				setProjects(rows)
				setLoading(false)
			}
		}
		load()
		const timer = setInterval(load, POLL_INTERVAL_MS)
		return () => {
			cancelled = true
			clearInterval(timer)
		}
	}, [seed])
	return { projects, loading, refresh: () => setSeed((x) => x + 1) }
}

export function useApiList(projectId: any) {
	const [apis, setApis] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	useEffect(() => {
		let cancelled = false
		const load = async () => {
			if (!projectId) {
				if (!cancelled) {
					setApis([])
					setLoading(false)
				}
				return
			}
			const rows = await listApisByProject(projectId)
			if (!cancelled) {
				setApis(rows)
				setLoading(false)
			}
		}
		void load()
		const timer = projectId ? setInterval(load, POLL_INTERVAL_MS) : null
		return () => {
			cancelled = true
			if (timer) clearInterval(timer)
		}
	}, [projectId])
	return { apis, loading }
}

export function useApiDetail(apiId: any) {
	const [api, setApi] = useState<any>(null)
	const [spec, setSpec] = useState<any>(null)
	const [samples, setSamples] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [seed, setSeed] = useState(0)
	useEffect(() => {
		let cancelled = false
		const load = async () => {
			if (!apiId) {
				if (!cancelled) {
					setApi(null)
					setSpec(null)
					setSamples([])
					setLoading(false)
				}
				return
			}
			const [a, s, ss] = await Promise.all([
				getApi(apiId),
				getLatestSpecByApi(apiId),
				listSamplesByApi(apiId, 20),
			])
			if (cancelled) return
			setApi(a ?? null)
			setSpec(s ?? null)
			setSamples(ss)
			setLoading(false)
		}
		void load()
		const timer = apiId ? setInterval(load, POLL_INTERVAL_MS) : null
		return () => {
			cancelled = true
			if (timer) clearInterval(timer)
		}
	}, [apiId, seed])
	return { api, spec, samples, loading, refresh: () => setSeed((x) => x + 1) }
}
