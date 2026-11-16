import { HistoryList } from '@/components/HistoryList'
import { SniffView } from '@/components/sniff/SniffView'
import { TipScriptConfirmDialog } from '@/components/TipScriptConfirmDialog'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { exportSessionAsMarkdown } from '@/lib/session-export'
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
	// batch 5 (sidepanel sub-views fork): temporary references, replaced by the real App
	HistoryList,
	SniffView,
	TipScriptConfirmDialog,
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
	exportSessionAsMarkdown,
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
