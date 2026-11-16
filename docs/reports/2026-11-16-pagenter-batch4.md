# 开发完成报告 · 批次 4：background

- **feature 分支**：`feature/pagenter-batch4-background`（已合入 `main`，合并提交 `ab34792`）
- **过程**：第一位 Engineer 中断，只留下三个纯逻辑模块（已先行合入 `96d4c54`）；第二位接着做完
- **复验**：`pnpm verify` 独立重跑通过，测试 152/152

## 验收标准

| AC | 结果 | 证据 |
| --- | --- | --- |
| AC-10 | 对比通过，BOT-4 待手动 | background 132、offscreen 35、db 40、kvStore 2、upstreamClient 2 条声明全部相同 |
| AC-15 Schema 推断 | 通过 | 16 个用例 |
| AC-15 脱敏 | 通过 | 11 个用例 |
| AC-15 URL 匹配 | 通过 | 7 个用例 |
| AC-16 | 通过 | strict 类型检查通过；未标 `TODO(types)` 的文件 0 个 |
| AC-17 | 通过 | `externally_connectable` 仍为 `http://localhost/*`；`handleApiCall` 与产物相同，只加了安全注释 |

## 对比数字

| | 相同 | 不同 | 仅原产物有 | 仅新产物有 |
| --- | --- | --- | --- | --- |
| 批次 3 结束 | 308 | 10 | 369 | 14 |
| 批次 4 结束 | 479 | 4 | 204 | 5 |

剩下的全部属于批次 5：4 个入口页 `App`（不同），4 个占位语句和一个临时引用（仅新产物有），界面、Script 模式和约 50 条 motion 声明（仅原产物有）。

## 对比规则变化

动态 import 路径里的 chunk 哈希不参与比对（`"./kvStore-B3infbmv.js"` 视为 `"./kvStore.js"`），只作用于 `./`、`../` 开头的字符串。有正反两个方向的测试。

## 新发现的安全问题（原样还原，已记入 spec 补充说明）

- Sniff 不脱敏 URL 查询参数。
- `originPatterns` 为空的项目匹配所有来源。
- 页面桥 KV 不按调用页面隔离。
- 任意网页都能通过 `__pagenter.llm()` 消耗用户的模型额度。

## 交接给批次 5

四个入口页、Script 模式与 TipScript、卡片界面、ScriptViewer（会让剩余 9 条 CodeMirror 声明对上）、约 50 条 motion 声明；补跑 BOT-2、BOT-4（界面版）、BOT-5，以及从侧边栏启动拾取器。
