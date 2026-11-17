import { ProjectDetail } from '@/components/sniff/ProjectDetail'
import { ProjectList } from '@/components/sniff/ProjectList'
import { useState } from 'react'

export function SniffView() {
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
	if (selectedProjectId) {
		return <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
	}
	return <ProjectList onSelect={setSelectedProjectId} />
}
