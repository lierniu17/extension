# chrome/pagenter

Pagenter 1.8.0 的源码：单个 WXT 工程（ADR-0002）。逆向还原已经完成，原产物
`../pagenter-ext-1.8.0-chrome` 已删除（在 git 历史里）；还原过程见
`../../docs/specs/2026-11-16-pagenter-reverse.md`。

## 命令

需要 Node ≥ 22.12（vitest 5 的要求，脚本用 `--experimental-strip-types` 直接跑 `.ts`）、pnpm 10。

```bash
pnpm install --frozen-lockfile   # 按 lockfile 安装
pnpm build                       # 构建到 .output/pagenter-ext-1.8.0-chrome
pnpm typecheck                   # wxt prepare + tsc --noEmit（strict）
pnpm check:any                   # 含显式 any 的文件必须在文件头标 // TODO(types)（原样保留的上游文件除外）
pnpm test                        # vitest
pnpm zip                         # 打包为 .output/pagenter-ext-1.8.0-chrome.zip
pnpm verify                      # build + typecheck + check:any + test
```

在 Chrome 加载：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `.output/pagenter-ext-1.8.0-chrome`。

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/entrypoints/` | background、content、pagenter-bridge（主世界）、sidepanel、options、popup、hub、offscreen |
| `src/core`、`src/llms`、`src/page-controller` | 上游三个包，作为子目录（core、llms 批次 2 已还原，page-controller 批次 3 已还原；`dom/dom_tree/index.js` 是 Pagenter 的重写版，不是上游的） |
| `src/agent`、`src/lib` | 扩展侧的 agent 层（MultiPageAgent、Tabs/RemotePageController 及其 `.background` 半边、tools、页面桥调用的 `exposedApis`）与共享模块（cdp、upstreamClient、元素拾取器 `elementPicker`、数据库 `db` 与 `kvStore`、Sniff 的 `src/lib/sniff/`） |
| `src/components`、`src/i18n`、`src/assets/index.css` | 界面组件（任务卡片、历史记录、Sniff 视图 `components/sniff/`、shadcn 的 `components/ui/`，其中几个未被引用的组件按上游保留，原产物 CSS 里有它们的类）与中英文语言包；`index.css` 在上游基础上加了五行 `@source not`，排除 core、llms、page-controller、scripts、tests，否则 Tailwind 会多扫出几个类，CSS 与产物对不上 |
| `public/` | `_locales` 与图标，从产物原样复制 |
| `scripts/` | `check-todo-types.ts`（`pnpm check:any`，原样保留的上游文件列表也在这里）与构建插件 `css-injection-inside-iife.ts` |
| `tests/` | vitest |

## 许可

上游 alibaba/page-agent 的 MIT 许可，见 `LICENSE`。
