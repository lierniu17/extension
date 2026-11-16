// 批次 3 还原 content 入口；批次 1 只保留空入口
export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_end',
	main() {
		console.debug('[Pagenter] content stub')
	},
})
