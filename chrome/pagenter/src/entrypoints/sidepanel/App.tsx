import { DEFAULT_SYSTEM_INSTRUCTION, resolveLlmConfig } from '@/agent/constants'
import { callApiByProjectAndTool, callUpstreamMcpByName } from '@/agent/exposedApis'
import { MultiPageAgent } from '@/agent/MultiPageAgent'
import {
	clearSessions,
	deleteSession,
	deleteTipScript,
	getMatchingTipScripts,
	getSession,
	listSessions,
	listTipScripts,
	saveSession,
	saveTipScript,
	updateSession,
	updateTipScript,
} from '@/lib/db'
import {
	countSamplesByApi,
	createProject,
	deleteProject,
	deleteUpstreamMcpServer,
	getApi,
	getLatestSpecByApi,
	getProject,
	listApisByProject,
	listProjects,
	listSamplesByApi,
	listUpstreamMcpServers,
	putSpec,
	putUpstreamMcpServer,
	updateApi,
	updateProject,
} from '@/lib/sniff/db'
import { probeCapabilities } from '@/llms'

const BATCH_2_MODULES = [
	MultiPageAgent,
	callApiByProjectAndTool,
	callUpstreamMcpByName,
	probeCapabilities,
	resolveLlmConfig,
	DEFAULT_SYSTEM_INSTRUCTION,
	// 批次 4：数据库的会话、TipScript、Sniff 表在界面里用（批次 5 换成真实用法）
	clearSessions,
	deleteSession,
	deleteTipScript,
	getMatchingTipScripts,
	getSession,
	listSessions,
	listTipScripts,
	saveSession,
	saveTipScript,
	updateSession,
	updateTipScript,
	countSamplesByApi,
	createProject,
	deleteProject,
	deleteUpstreamMcpServer,
	getApi,
	getLatestSpecByApi,
	getProject,
	listApisByProject,
	listProjects,
	listSamplesByApi,
	listUpstreamMcpServers,
	putSpec,
	putUpstreamMcpServer,
	updateApi,
	updateProject,
]

export default function App() {
	return <div data-modules={BATCH_2_MODULES.length}>Pagenter</div>
}
