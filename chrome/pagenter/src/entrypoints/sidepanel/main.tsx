// 批次 5 还原 sidepanel 界面；批次 1 只保留空入口
// 批次 2：引用 core / llms，让构建把它们打进来、对比脚本能看到（批次 5 换成真实界面）
import React from 'react'
import ReactDOM from 'react-dom/client'

import { DEFAULT_SYSTEM_INSTRUCTION, resolveLlmConfig } from '@/agent/constants'
import { callApiByProjectAndTool, callUpstreamMcpByName } from '@/agent/exposedApis'
import { MultiPageAgent } from '@/agent/MultiPageAgent'
import { probeCapabilities } from '@/llms'

const BATCH_2_MODULES = [
	MultiPageAgent,
	callApiByProjectAndTool,
	callUpstreamMcpByName,
	probeCapabilities,
	resolveLlmConfig,
	DEFAULT_SYSTEM_INSTRUCTION,
]

function App() {
	return <div data-modules={BATCH_2_MODULES.length}>Pagenter</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
)
