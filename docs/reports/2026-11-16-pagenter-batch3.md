# 开发完成报告 · 批次 3：page-controller、content 入口、页面桥与元素拾取器

- **feature 分支**：`feature/pagenter-batch3-page-controller`（已合入 `main`，合并提交 `eba8c12`）
- **复验**：`pnpm verify` 独立重跑通过，测试 115/115；content 与页面桥的声明在「不同」「仅一方有」中均为 0

## 验收标准

| AC | 结果 | 证据 |
| --- | --- | --- |
| AC-7（本批文件） | 通过 | `getPageInfo`、`checkDarkMode`、`patches/react`、`utils` 按 v1.7.1 逐字节照搬，git blob 校验通过 |
| AC-9 | 通过 | content 与页面桥 98 条声明全部相同；BOT-3 在真实浏览器中通过（见下） |
| AC-16 | 通过 | strict 类型检查通过；未标 `TODO(types)` 的文件 0 个 |

## BOT-3 真实浏览器验证

- `window.__pagenter` 在页面主世界可用：冻结对象，`version` 为 `"1.8.0"`，成员为 `callApi`、`mcp`、`listApis`、`llm`、`kv`（`kv` 含 `set`、`get`、`list`、`delete`）。
- 元素拾取器：顶部提示条、蓝色悬停框、`<p> 416×67` 尺寸提示、十字光标、点击后的绿色闪烁都正常；`ELEMENT_PICKED` 消息带 `cssSelector: "p:nth-of-type(2)"`、`xpath: "/html/body/p[2]"` 及元素文本与位置。

用户最初看到 `window.__pagenter` 为 undefined，原因是浏览器加载的是主仓库的构建目录，当时 `main` 还停在批次 2，页面桥仍是批次 1 的空入口；批次 3 的代码本身没有问题。

验证时还发现：自动化工具在同一窗口内切换标签页会让网页反复变为隐藏，而拾取器按原产物逻辑在隐藏时静默退出，因此要把发消息的扩展页移到另一个窗口才能完成测试。这是测试环境的特性，不是还原代码的问题。

## 对比数字

| | 相同 | 不同 | 仅原产物有 | 仅新产物有 |
| --- | --- | --- | --- | --- |
| 批次 2 结束 | 212 | 12 | 464 | 14 |
| 批次 3 结束 | 308 | 10 | 369 | 14 |

剩余 10 条「不同」：4 条是入口页 `App`（批次 5），6 条是 background 与数据库辅助函数（批次 4）。

## 本批的构建与规则变化

- **新依赖**：`vite-plugin-css-injected-by-js` 4.0.1（上游 v1.7.1 锁定的版本，产物中有它的原样注入代码），只用于 content 构建。
- **对比规则**：对 rollup 命名空间对象的引用按成员名比对。原因是原产物把 page-controller 先打成库，引用名带着那次构建的哈希。有正反两个方向的测试；在真实产物上只让 PageController 从「不同」变为「相同」。
- **CSS 模块按 CRLF 保存**：换成 LF 后类名哈希与产物对不上。
- **`ai-motion` 的 WebGL 动效**按第三方库处理，不还原源码。

## 交接给后续批次

- 批次 4：background 的 `definition`、4 个数据库辅助函数和 `listUpstreamMcpServers`；原产物 `chunks/index` 里有一个包含 `getDB`、`getMatchingTipScripts` 等成员的命名空间对象，新规则会作用到引用它的代码。
- 批次 5：拾取器的入口在侧边栏，批次 5 还原侧边栏后补测从界面启动拾取并显示结果。
