# 开发完成报告 · 批次 2：llms 与 core

- **feature 分支**：`feature/pagenter-batch2-llms-core`（已合入 `main`，合并提交 `20a85a2`）
- **过程**：第一位 Engineer 在会话结束时被中断（留下 `3e84deb`、`89e5004`），第二位从这两个提交接着做完
- **复验**：`pnpm verify` 独立重跑通过，测试 103/103

## 验收标准

| AC | 结果 | 证据 |
| --- | --- | --- |
| AC-7（本批文件） | 通过 | 未改动的上游文件按 v1.7.1 的 git blob 逐字节校验；本批涉及 `src/llms/errors.ts` |
| AC-8 | 对比通过，BOT-2 顺延 | `constants`（llms）42 条全部相同；`cards` 中 PageAgentCore、parseAgentOutput、tools、MultiPageAgent 等全部相同。BOT-2 要在侧边栏执行任务，侧边栏到批次 5 才还原，顺延到批次 5 一起跑 |
| AC-15（parseAgentOutput） | 通过 | 21 个输入输出用例：纯 JSON、代码块、修复、内容块、各类错误、重试 |
| AC-16 | 通过 | strict 类型检查通过；未标 `TODO(types)` 的文件 0 个 |

## 对比数字

| | 相同 | 不同 | 仅原产物有 | 仅新产物有 |
| --- | --- | --- | --- | --- |
| 批次 1 结束 | 4 | 7 | 1949 | 7 |
| 批次 2 结束 | 212 | 12 | 464 | 14 |

`cards` 里原先 1276 条「仅原产物有」的去向：

- **llms / core 逻辑**：0 条真实遗漏。剩 1 条 cdp 的 `debug` 常量，内容相同，是因为 background 里有一个批次 4 的同名声明抢了配对，批次 4 后消失。
- **第三方库**：1242 条，其中 1233 条已排除；剩 9 条 CodeMirror 声明受按需摇树影响，批次 5 还原 ScriptViewer 后会对上（已用一次性构建验证）。
- **后续批次**：33 条，全部属于批次 5，包括 Script 模式（`ScriptModeAgent` 等 11 条）、`useAgent` 相关 5 条（它依赖 `ScriptModeAgent`）、卡片界面 17 条。

## 新增依赖

CodeMirror 与 lezer 共 21 个包，版本靠逐个构建、与产物逐声明比对确定，构建时间落在 2026-04-01 到 2026-04-16 之间。唯一的歧义：`@lezer/common` 1.5.1 与 1.5.2 在打包代码上完全相同，取 1.5.2，已在 `third-party.ts` 注明。

## 对比脚本的规则变化（均有反向测试）

- **属性简写**：`{a}` 与 `{a: a}` 视为相同；`{content: content.x}`、`{a: a ? 1 : 2}`、`{a: a()}` 仍报为不同。
- **原样照搬的上游文件不查 `any` 标记**：只覆盖未改动文件表里的 10 个文件，它们被 AC-7 锁死，改动会让测试失败。
- **第三方来源标注**：按最终 chunk 的顶层语句对齐来源；对不齐时回退到旧逻辑，不会把自有代码误标为第三方。
- **类改名**：`let X$1 = class X {…}` 按 `class X {…}` 比对，仅限绑定名与类名一致；类体或类名不同仍报为不同。

## 交接给后续批次

- 批次 5：Script 模式、`useAgent`、卡片界面、ScriptViewer；`chunks/index` 里约 50 条 motion 声明待核对（摇树或版本问题）；补跑 BOT-2。
- 批次 4：background 里那个同名 `debug` 声明。
