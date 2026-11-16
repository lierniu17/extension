// 批次 4 还原 background 的业务逻辑；批次 1 只保留空入口
// 批次 2：引用 background 也打包了一份的共享模块（CDP、模型配置、上游 MCP），
// 让对比脚本能配上 background.js 里的那一份（批次 4 换成真实用法）
import { resolveLlmConfig } from '@/agent/constants'
import {
	callApiByProjectAndTool,
	callUpstreamMcpByName,
	extractOrigin,
	findProjectByOrigin,
} from '@/agent/exposedApis'
import { cdpSend, wrapScriptForEval } from '@/lib/cdp'
import { callUpstreamTool } from '@/lib/upstreamClient'

const STUB = {
	// 后台入口占位：CDP 代理、Sniff、上游 MCP 转发在批次 4 还原
	batch: 4,
	modules: [
		resolveLlmConfig,
		cdpSend,
		wrapScriptForEval,
		callUpstreamTool,
		callApiByProjectAndTool,
		callUpstreamMcpByName,
		extractOrigin,
		findProjectByOrigin,
	],
}

function backgroundMain() {
	console.debug('[Pagenter] background stub', __VERSION__, STUB.batch, STUB.modules.length)
}

export default defineBackground(backgroundMain)
