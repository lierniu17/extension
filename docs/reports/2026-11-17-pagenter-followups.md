# 开发完成报告 · 遗留工作：安全修复与类型收紧

- **安全修复**：`feature/pagenter-security`，spec 为 `docs/specs/2026-11-17-pagenter-security-fixes.md`，合并提交 `5d35b3b`
- **类型收紧**：`feature/pagenter-types`，两轮（`2e7b2ff`、`d06e19f`），合并时解决了 3 处冲突（同一行一边改逻辑、一边加类型，合并为两者兼有）
- **复验**：合并后 `pnpm verify` 通过，测试 181/181；原产物目录未改动

## 安全修复验收

| AC | 结果 | 证据 |
| --- | --- | --- |
| AC-1 页面桥无任务时拒绝 | 测试通过，BOT-1 待手动 | 授权判断按 `sender.tab.id`，无任务、他人标签页有任务、子 frame 均拒绝；立即返回，不再等 15 秒 |
| AC-2 任务期间可用 | 测试通过，BOT-2 待手动 | agent 任务开始、换标签页、结束；TipScript 成功、失败、超时都覆盖 |
| AC-3 KV 按标签页隔离 | 测试通过 | 会话 id 来自授权结果，不再用全局 `lastSessionId` |
| AC-4 Hub 点击后才连 | 组件测试部分通过，BOT-3 待手动 | 「不点不连」这一条只有 BOT-3 能验（没有引入 DOM 测试环境） |
| AC-5 端口校验 | 测试通过 | 只接受 1–65535 的整数；`externally_connectable` 未变 |
| AC-6 查询参数打码 | 测试通过，BOT-4 待手动 | 手机号、邮箱、token 均打码；只影响新样本 |
| AC-7 空来源不匹配 | 测试通过，BOT-4 待手动 | 空列表不匹配；项目详情页显示提示 |
| AC-8 差异只在修复处 | 通过 | 见下表 |

## 对比差异（全部来自安全修复）

- **不同 12 条**：background 的入口、`handleKvCall`、`NetworkRecorder`、`originMatches`；`MultiPageAgent`、`ScriptModeAgent`、cards 里的 `originMatches`；Hub 的 `useHubWs`、`App`；两份语言包；`ProjectDetail`。
- **仅新产物有 22 条**：页面桥授权、TipScript 会话登记、查询参数打码、端口校验、Hub 连接提示、空来源提示等新增函数。
- **仅原产物有 0 条**。类型收紧没有引起任何差异。

因此 `pnpm compare --strict` 在 `main` 上会退出 1，这是预期的。

## 类型收紧

- 标着 `TODO(types)` 的文件从 68 个降到 0 个，显式 `any` 从约 770 处降到 0（唯一保留的一处在上游原样照搬、被测试锁定的 `llms/errors.ts`）。
- 两轮都保证对比结果不变：单独看类型分支是 629 / 0 / 0 / 0。

## Engineer 自行做的设计决定

- **TipScript 不在 agent 任务里运行时**，KV 用每个标签页单独的会话（`tipscript-tab-<标签页 id>`），不再用全局会话，避免带自动 TipScript 的网页读到 agent 在别的网站上存的数据。这些数据在 service worker 重启时会被清理。这与 spec AC-3「按发起调用的标签页所属会话隔离」一致。
- **额外加固**：`TIPSCRIPT_EXECUTE` 优先用 `sender.tab.id`，内容脚本不能替别的标签页执行；子 frame 的页面桥调用一律拒绝。

## 已知的剩余问题

- agent 在一个步骤里新开的标签页，要到下一步才获得页面桥授权。
- service worker 在任务中途被回收时，授权要等下一步重新上报才恢复。
- localhost 页面仍能让已打开的 Hub 重新加载（从而断开连接），但不能让它连接。
- 项目没有编辑来源的界面，提示里引导用户在目标网站上重新创建项目。
- 任务或 TipScript 运行期间，网页自身的脚本也能调用页面桥（spec 允许）。
