# chrome/pagenter

Pagenter 1.8.0 的还原源码（Restored Source）：单个 WXT 工程（ADR-0002），以产物
`../pagenter-ext-1.8.0-chrome` 为唯一事实来源（ADR-0001）。还原计划与验收标准见
`../../docs/specs/2026-11-16-pagenter-reverse.md`。

## 命令

需要 Node ≥ 22.12（vitest 5 的要求，脚本用 `--experimental-strip-types` 直接跑 `.ts`）、pnpm 10。

```bash
pnpm install --frozen-lockfile   # 按 lockfile 安装
pnpm build                       # 构建到 .output/chrome-mv3（关闭压缩）
pnpm typecheck                   # wxt prepare + tsc --noEmit（strict）
pnpm check:any                   # 含显式 any 的文件必须在文件头标 // TODO(types)（原样保留的上游文件除外）
pnpm test                        # vitest；tests/build/ 下的用例读 pnpm build 的产物
pnpm compare                     # 对比脚本，见下
pnpm verify                      # build + typecheck + check:any + test + compare
```

在 Chrome 加载：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `.output/chrome-mv3`。

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/entrypoints/` | background、content、pagenter-bridge（主世界）、sidepanel、options、popup、hub、offscreen |
| `src/core`、`src/llms`、`src/page-controller` | 上游三个包，作为子目录（core、llms 批次 2 已还原，page-controller 批次 3 已还原；`dom/dom_tree/index.js` 是 Pagenter 的重写版，不是上游的） |
| `src/agent`、`src/lib` | 扩展侧的 agent 层（MultiPageAgent、Tabs/RemotePageController 及其 `.background` 半边、tools、页面桥调用的 `exposedApis`）与共享模块（cdp、upstreamClient、元素拾取器 `elementPicker`、数据库 `db` 与 `kvStore`、Sniff 的 `src/lib/sniff/`） |
| `public/` | `_locales` 与图标，从产物原样复制 |
| `scripts/compare/` | 对比脚本 |
| `scripts/unchanged-files.ts` | 生成「未改动文件表」 |
| `docs/unchanged-files.json` | 「未改动文件表」（AC-7 的输入） |
| `tests/` | vitest；`tests/fixtures/bundle-snapshot.json` 是还原开始前产物的文件哈希（AC-2） |

## 对比脚本

```bash
pnpm build
pnpm compare                    # 默认：原产物 ../pagenter-ext-1.8.0-chrome，新产物 .output/chrome-mv3
pnpm compare --strict           # 「不同」「仅一方有」、版本、manifest、文件清单任一不为空即退出码 1（AC-13 / BOT-6）
pnpm compare --original <dir> --restored <dir> --out <dir> [--no-probe]
```

输出 `.output/compare/report.md`（给人看）与 `report.json`（含每条声明的两侧源码）。

口径：

- 两边 `.js` 都先用 prettier 格式化，再用 acorn 取顶层声明（函数、类、变量；不声明任何名字的顶层语句记作 `<statement>`）。WXT 给 background / content / bridge 包的 IIFE 会先拆开。
- import / export 语句去掉；`import { e as getSession$1 }` 这类 Vite 短名别名映射回真名；动态 import 里的 chunk 路径字面量去掉 hash（`"./kvStore-B3infbmv.js"` 按 `"./kvStore.js"` 比，只认 `./`、`../` 开头的路径）。
- 比较的是去掉空白后的 token 序列（注释也算），并做三种归一：rollup 重名后缀（`$1`、`$d`、嵌套作用域里的 `current2`）去掉；prettier 因行宽才加的尾逗号去掉；键与值同名的属性（rollup 改名后写成的 `{ content: content2 }`）按简写 `{ content }` 比；rollup 给重名类写成的 `let X$1 = class X { ... };` 按 `class X { ... }` 比（同名的两个类谁被改名取决于 chunk 里还有什么）。代价：只差一个尾部数字的标识符（`x1` / `x2`）会被视为相同。对 rollup 模块命名空间对象的引用按命名空间的成员名比（产物里叫 `SimulatorMaskSNxPmVn`，带着库构建的 chunk hash；从源码构建叫 `SimulatorMask$1`），局部变量、属性名即使同名也不算引用。
- 对应关系：按声明名配对，文件名与 chunk 拆分不影响；同名声明有多份时先按声明体配，再按「逻辑文件」（去掉 chunk hash 的路径，如 `chunks/db`）配；对不上的进「仅一方有」，由人判断是口径问题还是还原遗漏。
- 排除项（不进三类清单，单独列在报告里）：
  - 新产物的第三方代码：构建时 `scripts/compare/decl-origin-plugin.ts` 记下每个声明来自哪个包（写到 `.output/compare/decl-origin/`，不进扩展目录）。模块代码取自 rollup 渲染结果，而 Vite 之后的 esbuild 还会改名（`Parse$1` → `Parse2`）、补 `var _a;`，所以按顺序把最终 chunk 的顶层语句与各模块的语句对齐，名字和语句取最终 chunk 的；对不齐（如 WXT 包了 IIFE 的入口）就退回用渲染结果。
  - 原产物的第三方代码：原产物没有模块边界，靠「声明体与已知第三方声明相同」识别。已知第三方声明来自新产物和 vendor probe —— `third-party.ts` 里列了 `probe` 的包会被单独打成一个小 bundle（`.output/compare/probe/`）。新加依赖时把它加进 `third-party.ts`。probe 用 `export *` 引入整包，不会像产物那样按调用处的实参再摇树（如 `gutters()` 无参调用时去掉 `config` 分支），这类声明要等真正用到它的代码还原后才会对上。
  - 构建辅助代码：`__vitePreload` 等 Vite/rollup 胶水代码与 rollup 的模块命名空间对象。
- 版本核对：`third-party.ts` 是版本对照表（来源：产物里读到的版本串 / 声明体指纹 / 上游 v1.7.1 / 工具链），报告里逐个列出期望版本、lockfile 版本和产物里读到的版本。

## 未改动文件表

```bash
pnpm unchanged-files --upstream <alibaba/page-agent 的本地 clone>   # 只用 git show 读 v1.7.1
```

对上游 v1.7.1 `packages/{core,llms,page-controller,extension}` 的每个文件：代码文件用 esbuild 转译（同 Vite），把 CommonJS 互操作写法换成产物的写法（`useState` → `reactExports.useState`），再用对比脚本的口径逐声明与产物比；`public/` 资源比哈希；CSS、SVG 标 `manual`。`unchanged` 列表就是 AC-7 要逐个比较的文件；其余状态（`changed` / `absent` / `no-runtime-code` / `manual` / `not-in-bundle`）留作参考。

## 许可

上游 alibaba/page-agent 的 MIT 许可，见 `LICENSE`。
