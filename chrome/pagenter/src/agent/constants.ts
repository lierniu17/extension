// TODO(types)

export const EMPTY_LLM_CONFIG = { baseURL: '', model: '', apiKey: '' }
export function getDefaultLlmConfig() {
	return EMPTY_LLM_CONFIG
}
export function resolveLlmConfig(stored: any) {
	const llmConfig = stored
	if (llmConfig?.baseURL || llmConfig?.model || llmConfig?.apiKey) return llmConfig
	return getDefaultLlmConfig()
}
export const DEFAULT_SYSTEM_INSTRUCTION = `** 现有代码 ** 对已有代码进行迭代时，默认代码中信息和逻辑可信，微小改动也需通读全部代码，杜绝引入新异常。
** 注释与代码同等重要 ** 每3行代码需至少1行注释，确保零基础新手能独懂代码。更新代码时须同步更新注释。
** 选择器 ** 须通过 inspect_dom 实际验证，用户给出的定位等相关描述仅供参考。
** 节奏 ** 小步快跑，每步以能快速响应优先，不要强求一次全部搞定。
** BUG留档 ** 修复BUG后在对应位置注释记录现象和成因。
** 样式 ** 未明确要求默认不改动视觉元素。`
