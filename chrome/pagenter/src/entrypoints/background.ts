// 批次 4 还原 background 的业务逻辑；批次 1 只保留空入口
const STUB = {
	// 后台入口占位：CDP 代理、Sniff、上游 MCP 转发在批次 4 还原
	batch: 4,
}

function backgroundMain() {
	console.debug('[Pagenter] background stub', __VERSION__, STUB.batch)
}

export default defineBackground(backgroundMain)
