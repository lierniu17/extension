// 页面桥：注入网页主世界，批次 3 还原 window.__pagenter；批次 1 只保留空入口
export default defineUnlistedScript(() => {
	console.debug('[Pagenter] bridge stub', __VERSION__)
})
