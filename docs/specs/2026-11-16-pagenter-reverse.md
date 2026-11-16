# Pagenter 逆向还原

## 问题陈述

我们手上只有 Pagenter 1.8.0 的已构建产物（`chrome/pagenter-ext-1.8.0-chrome`），没有源码，也没有 sourcemap。想继续开发新版本、修 bug、查安全问题，现在只能直接改构建产物：改完无法重新构建，改动也无法评审，更没法在它上面长期维护。

产物虽然没有压缩，函数名和中文注释都在，但它是 WXT + Vite 打出来的十几个 chunk，上游代码、第三方库和 Pagenter 自有代码混在一起。从产物上看不出哪些文件相对上游 v1.7.1 改过、改了多少，也看不出 Sniff、TipScript、Script 模式这些自有功能的边界。

## 解决方案

在 `chrome/pagenter/` 还原出一个可构建、可长期维护的单个 WXT 工程，原产物目录原样保留，作为对比基准。

还原以产物为准：相对上游 v1.7.1 没改的文件直接用上游源码，改过的部分按产物重写，Pagenter 自有功能全部从产物还原。还原是否完整，由一个对比脚本判定：新旧产物格式化后按顶层声明名逐函数比对，只允许 import 写法和顺序不同。核心逻辑里的纯函数模块另外补单元测试。

还原工作分 5 批，按抽象层横切，先做工程骨架和对比脚本，后面每批都用这个脚本验收。

## 用户故事

### 工程与基线

- **US-1** 作为维护者，我想要在 `chrome/pagenter/` 下得到一个能构建出扩展的单个 WXT 工程，以便不再直接修改构建产物。
- **US-2** 作为维护者，我想要原产物目录 `chrome/pagenter-ext-1.8.0-chrome` 原样保留、不被任何还原步骤改动，以便它始终是对比基准。
- **US-3** 作为维护者，我想要依赖版本锁定在 lockfile 里，且能从产物读出的版本（如 React 19.2.4）与产物一致，以便构建结果可复现。
- **US-4** 作为维护者，我想要构建时关闭压缩，以便新产物能和原产物逐函数对比。
- **US-5** 作为维护者，我想要 core、llms、page-controller 作为 `src/` 下的子目录存在，以便只维护一个工程（ADR-0002）。

### 还原范围

- **US-6** 作为维护者，我想要相对基线 v1.7.1 没改过的文件直接使用上游源码，以便减少重写带来的偏差。
- **US-7** 作为维护者，我想要 llms 与 core 中改过的部分（输出解析、OpenAIClient、PageAgentCore、tools）按产物重写，以便行为与 Pagenter 1.8.0 一致。
- **US-8** 作为维护者，我想要 page-controller、content 入口、页面桥和元素拾取器被还原，以便页面操作、Hint 标记和 `window.__pagenter` 行为不变。
- **US-9** 作为维护者，我想要 background 被还原（CDP 代理、Sniff 记录与脱敏、offscreen Schema 推断、上游 MCP 转发、数据库），以便后台能力不变。
- **US-10** 作为维护者，我想要 sidepanel、options、popup、Hub 的界面以及 Script 模式和 TipScript 被还原，以便所有入口页功能不变。
- **US-11** 作为维护者，我想要还原后的 manifest 和文件清单与原产物一致，以便加载后权限、入口和语言包与原扩展相同。

### 验收与质量

- **US-12** 作为维护者，我想要一个对比脚本，把新旧产物格式化后按顶层声明名逐函数比对并输出「相同、不同、仅一方有」三类，以便客观判断还原是否完整。
- **US-13** 作为维护者，我想要第三方库（react-dom、zod、lucide、tailwind-merge、radix、idb 等）不参与比对、只核对版本，以便对比结果只反映业务代码。
- **US-14** 作为维护者，我想要纯逻辑模块（输出解析、Schema 推断、脱敏、URL 匹配）有 vitest 单元测试，以便后续修改有回归保护。
- **US-15** 作为维护者，我想要 tsconfig 开启 strict，无法推断的类型用显式 any 并在文件头标 `// TODO(types)`，以便还原时能构建、之后再逐模块收紧。

### 边界与流程

- **US-16** 作为维护者，我想要已发现的安全隐患（`externally_connectable` 放行 localhost、`handleApiCall` 带登录态发请求）被原样还原并记录下来，以便还原结果和产物保持一致、之后另开分支修复。
- **US-17** 作为维护者，我想要保留上游 MIT LICENSE 与版权声明，以便满足上游许可要求。
- **US-18** 作为维护者，我想要每一批在独立 feature 分支上完成、使用英文提交信息，通过对比脚本验收后合进 `main`，以便每批都可单独评审和回退。

## 验收标准

### 工程与基线

- **AC-1** 在 `chrome/pagenter/` 下执行安装与构建命令后，能产出可加载的扩展目录，且构建过程无报错。〔覆盖 US-1, US-5〕
  - **怎么验**：真实页面 BOT-1 执行安装与构建，检查退出码为 0、产物目录存在；人工走查确认 `src/core`、`src/llms`、`src/page-controller` 三个子目录都在同一个工程内。
- **AC-2** 还原全过程结束后，`chrome/pagenter-ext-1.8.0-chrome` 下所有文件的内容与还原开始前完全一致。〔覆盖 US-2〕
  - **怎么验**：纯函数测试对该目录做文件清单与哈希比对；同时用 `git status` 检查该目录没有任何改动。
- **AC-3** lockfile 已提交；从产物能读到的依赖版本（至少 React 19.2.4）与产物一致，读不到的使用上游 v1.7.1 `package.json` 中的版本。〔覆盖 US-3〕
  - **怎么验**：纯函数测试读取 lockfile 与版本对照表逐项比较；真实页面 BOT-1 在干净目录里按 lockfile 安装后再次构建，结果一致。
- **AC-4** 构建配置关闭压缩，新产物中函数名、变量名与注释不被改写。〔覆盖 US-4〕
  - **怎么验**：纯函数测试对新产物抽样，检查顶层函数名与中文注释仍然存在；对比脚本能成功解析新产物。
- **AC-5** 仓库根目录保留上游 MIT LICENSE 与版权声明，且没有额外加入自有代码的授权说明。〔覆盖 US-17〕
  - **怎么验**：人工走查检查 LICENSE 文件内容与上游一致，README 里没有授权待确认之类的说明。

### 还原范围

- **AC-6** 还原后的 manifest 与原产物 manifest 在权限、入口、content_scripts、`externally_connectable`、`web_accessible_resources`、`options_ui`、`side_panel` 等字段上逐项一致，文件清单（不含 chunk 的拆分方式）与原产物一致。〔覆盖 US-11, US-16〕
  - **怎么验**：纯函数测试对两份 manifest 做字段级比较；对文件清单做集合比较，只允许 chunk 文件名不同。
- **AC-7** 相对基线 v1.7.1 没改过的文件，其内容与上游 v1.7.1 对应源码一致（保留原类型）。〔覆盖 US-6, US-15〕
  - **怎么验**：纯函数测试把这些文件与上游 v1.7.1 的对应文件逐个比较；清单由批次 1 产出的「未改动文件表」给出。
- **AC-8** llms 与 core 的对比结果中，`parseAgentOutput`、`OpenAIClient`、`PageAgentCore`、tools 等声明都落在「相同」一类。〔覆盖 US-7〕
  - **怎么验**：批次 2 完成后运行对比脚本，检查这些声明不出现在「不同」和「仅一方有」两类里；真实页面 BOT-2 加载扩展后在侧边栏执行一个简单任务。
- **AC-9** page-controller、content 入口、页面桥和元素拾取器的声明全部落在「相同」一类，且 `window.__pagenter` 在页面主世界可用。〔覆盖 US-8〕
  - **怎么验**：批次 3 完成后运行对比脚本；真实页面 BOT-3 在任意网页的控制台检查 `window.__pagenter`，并用元素拾取器点选一个元素，看到 CSS 选择器和 XPath。
- **AC-10** background 的声明（CDP 代理、NetworkRecorder、脱敏、offscreen Schema 推断、上游 MCP 转发、数据库）全部落在「相同」一类。〔覆盖 US-9〕
  - **怎么验**：批次 4 完成后运行对比脚本；真实页面 BOT-4 打开 Sniff 抓取一个页面的请求，检查样本被脱敏、Schema 被生成。
- **AC-11** sidepanel、options、popup、Hub 的界面声明以及 Script 模式、TipScript 的声明全部落在「相同」一类。〔覆盖 US-10〕
  - **怎么验**：批次 5 完成后运行对比脚本；真实页面 BOT-5 逐个打开侧边栏、设置页、弹窗和 Hub，保存并自动执行一个 TipScript。

### 验收与质量

- **AC-12** 对比脚本能把新旧产物都用 prettier 格式化，按顶层声明名比对声明体（去掉 import/export 和 Vite 短名别名），并输出「相同、不同、仅一方有」三类清单。〔覆盖 US-12〕
  - **怎么验**：纯函数测试用构造的两份小型产物样本，分别覆盖声明相同、声明体不同、仅一方有、短名别名不同但声明体相同、import 顺序不同这五种情况，检查分类结果正确。
- **AC-13** 全部批次完成后，对比脚本输出里「不同」和「仅一方有」两类均为空；chunk 的拆分方式和文件名不同不算差异。〔覆盖 US-12, US-4〕
  - **怎么验**：真实页面 BOT-6 在全量构建后运行对比脚本，检查两类清单均为 0 条，并保存报告。
- **AC-14** 第三方库（react-dom、zod、lucide、tailwind-merge、radix、idb 等）不参与声明比对，只核对版本号与产物一致。〔覆盖 US-13, US-3〕
  - **怎么验**：纯函数测试检查对比脚本的排除名单生效，被排除的库声明不出现在三类清单里；版本核对结果写进对比报告。
- **AC-15** 输出解析（`parseAgentOutput`）、Schema 推断、脱敏、URL 匹配这四个纯逻辑模块各有 vitest 单元测试，且全部通过。〔覆盖 US-14〕
  - **怎么验**：纯函数测试，执行 vitest 全量，检查四个模块的测试文件存在、用例通过；用例只断言输入输出，不断言内部实现。
- **AC-16** `tsconfig` 开启 `strict`，工程类型检查通过；所有显式 `any` 所在文件的文件头都有 `// TODO(types)` 标记；上游未改动的文件保留原类型。〔覆盖 US-15, US-6〕
  - **怎么验**：纯函数测试执行类型检查，检查退出码为 0；另写一个检查脚本扫描含显式 `any` 的文件，断言文件头有 `TODO(types)`。
- **AC-17** 还原后 `externally_connectable` 仍放行 `http://localhost/*`，`handleApiCall` 的行为与原产物一致；这两项已记录在 spec 的补充说明里，没有在还原中被修改。〔覆盖 US-16〕
  - **怎么验**：纯函数测试检查 manifest 中 `externally_connectable` 字段与原产物一致；`handleApiCall` 靠 AC-10 的对比结果兜底；人工走查确认补充说明里有这两条记录。
- **AC-18** 每一批都在独立的 feature 分支上完成，提交信息为英文，对比脚本验收通过后才合进 `main`；`main` 上没有未通过验收的批次。〔覆盖 US-18〕
  - **怎么验**：人工走查检查分支名、提交信息语言和合并记录；每批合并前对比报告随开发完成报告一起提交，缺报告不得合并。

## 测试决策

### 接缝

这次只有两个接缝，都是审问第 2、3 轮里跟用户确认过的，不新造第三个：

- **① 纯函数 / 脚本接缝（vitest）**：覆盖对比脚本本身、四个纯逻辑模块（`parseAgentOutput`、Schema 推断、脱敏、URL 匹配）、manifest 与文件清单比较、依赖版本核对、`TODO(types)` 扫描。命令统一用 vitest 单文件或全量执行。仓库里目前没有任何测试，没有先例，批次 1 新建 vitest 配置并作为后面各批的先例。
- **⑤ 真实扩展接缝（BOT）**：在 Chrome 里加载未打包的扩展，由 chrome-devtools 逐条执行 BOT 用例。它是唯一覆盖 chrome API、content script、service worker 接线的接缝。

不做 story 交互测试、服务层测试、路由与契约测试：这个工程没有 Storybook，也没有后端。UI 与 chrome API 相关的代码不写单元测试，靠对比脚本（AC-13）兜底。

好测试的标准：只断言外部行为（输入输出、分类结果、页面上看到的东西），不断言内部实现；对比脚本的测试用构造的小样本，不依赖真实产物。

### e2e:bot 用例

所有用例都在加载了还原版扩展的 Chrome 里执行。BOT-1 在干净目录里先构建，其余各条用 BOT-1 的产物。

- **BOT-1** 〔验证 AC-1, AC-3〕
  - 前置：一个干净的新目录，只有 `chrome/pagenter/` 的源码和已提交的 lockfile；Node 版本符合 `.nvmrc`。
  - 步骤：1. 按 lockfile 安装依赖。2. 执行构建命令。3. 在 `chrome://extensions` 打开开发者模式，加载新产物目录。
  - 预期：安装与构建退出码均为 0；扩展加载成功，没有红色错误按钮；工具栏出现 Pagenter 图标。
  - 截图：扩展加载成功后的 `chrome://extensions` 页面。
- **BOT-2** 〔验证 AC-8〕
  - 前置：BOT-1 加载的扩展；在设置页配置好一个可用的模型；打开一个普通网页。
  - 步骤：1. 打开侧边栏。2. 输入一个简单任务，例如「点击页面上的第一个链接」。3. 等待任务结束。
  - 预期：侧边栏显示执行步骤并以结果卡结束；页面上出现 Hint 标记和模拟光标；历史列表里多一条记录。
  - 截图：任务结束后的侧边栏。
- **BOT-3** 〔验证 AC-9〕
  - 前置：BOT-1 加载的扩展；一个普通网页。
  - 步骤：1. 在页面控制台输入 `window.__pagenter`。2. 打开元素拾取器，点选页面上一个元素。
  - 预期：控制台能看到页面桥对象；拾取器显示该元素的 CSS 选择器和 XPath。
  - 截图：控制台输出与拾取器的提示。
- **BOT-4** 〔验证 AC-10〕
  - 前置：BOT-1 加载的扩展；一个会发出 JSON 接口请求的网页。
  - 步骤：1. 在侧边栏进入 Sniff 视图，新建项目并开始记录。2. 刷新网页触发请求。3. 打开该项目下的接口详情。
  - 预期：接口列表出现被抓到的请求；样本中的敏感请求头和值已脱敏；详情页能看到推断出的 Schema。
  - 截图：接口详情页的 Schema 与样本。
- **BOT-5** 〔验证 AC-11〕
  - 前置：BOT-1 加载的扩展；一个可以用 Script 模式完成的简单页面任务。
  - 步骤：1. 依次打开侧边栏、设置页、弹窗和 Hub 页，各确认能正常显示。2. 用 Script 模式完成一个任务并保存为 TipScript。3. 回到匹配的网址，让它自动执行。
  - 预期：四个入口页都能打开且无报错；TipScript 出现在设置页列表里，并在匹配网址上被触发。
  - 截图：设置页的 TipScript 列表。
- **BOT-6** 〔验证 AC-13〕
  - 前置：全部 5 批已合并后的工程；原产物目录未改动。
  - 步骤：1. 全量构建（关闭压缩）。2. 运行对比脚本，输入原产物目录和新产物目录。3. 打开生成的对比报告。
  - 预期：「不同」和「仅一方有」两类清单均为 0 条；第三方库版本核对全部一致。
  - 截图：对比报告的汇总页。

### 主流程回归

不影响，理由是：这个仓库里除了 `chrome/pagenter/` 的新工程，只有原产物目录和 `vscode/drag-import`，本次改动不触碰后两者，没有需要回归的稳定主流程，也不需要补 `pnpm e2e:regression` 用例。

## 实现决策

### 总体决策

- **以产物为准**（ADR-0001）：产物是唯一事实来源。相对基线 v1.7.1 没改的文件直接用上游源码；改过的部分按产物重写；Pagenter 自有功能全部从产物还原。基线是上游 v1.7.1，另含三个之后的小修复（ResultCard 样式、SimulatorMask 的 rAF 修复、`Array.from(querySelectorAll(...))`）。Pagenter 的 1.8.0 是独立编号，与上游 v1.8.0 无关。
- **单个 WXT 工程**（ADR-0002）：core、llms、page-controller 作为 `src/` 下的子目录，不拆 pnpm workspace，之后也不再合并上游更新，需要的上游修复手工移植。
- **构建配置**：关闭压缩，其余用 WXT 默认配置。依赖版本能从产物读出的照抄（如 React 19.2.4），读不到的用上游 v1.7.1 的版本，并锁定在 lockfile 里。chunk 划分不要求与原产物一致，只比对函数体。
- **类型策略**：`tsconfig` 开 `strict`；无法推断的类型用显式 `any`，并在文件头标 `// TODO(types)`；上游未改动的文件保留原类型。类型收紧放在还原完成之后，另开 feature 分支逐模块做。
- **测试策略**：只给纯逻辑模块补 vitest，UI 与 chrome API 相关的代码不写测试，靠对比脚本兜底。
- **许可**：只保留上游 MIT LICENSE 与版权声明，不额外加自有代码的授权说明。
- **安全问题原样还原**：`externally_connectable` 放行 `http://localhost/*`，`handleApiCall` 会替页面带登录态发请求。两项都先保持原样，记录在「补充说明」里，之后另开 feature 分支修复，不在还原中顺手改，这样对比结果才干净。

### 对比脚本（验收的核心）

- **输入**：原产物目录、新产物目录。**输出**：「相同、不同、仅一方有」三类声明清单，加一份依赖版本核对结果。
- **步骤**：两边都先用 prettier 格式化；解析每个文件的顶层声明（函数、类、常量）；去掉 import/export 语句，并把 Vite 跨 chunk 的短名别名（如 `import { e as getSession }`）还原成真名；再按声明名比对声明体。
- **排除项**：第三方库（react-dom、zod、lucide、tailwind-merge、radix、idb 等）的声明不参与比对，只核对版本号。
- **通过条件**：「不同」和「仅一方有」两类都为空。import 写法、声明顺序、chunk 拆分和文件名的差异不算差异。
- **口径要点**：声明名在产物里可能重名（不同 chunk 里各有一份），脚本按「所在文件加声明名」建立对应关系，对应不上的归入「仅一方有」，由人确认后决定是脚本口径问题还是还原遗漏。

### 各批次的还原要点

- **llms 与 core**：产物里 `OpenAIClient` 已改成纯文本补全加 token 参数回退，不使用 tool-calls；`PageAgentCore` 的输出协议是 progress / pending / reasoning 的 JSON 格式，带内容块、历史摘要、截图、错误分级；`parseAgentOutput` 取代了上游的 `autoFixer`。模型能力探测（连通性、token 参数、视觉、上下文长度）从产物原样还原。
- **page-controller 与 content**：`dom_tree` 是重写版（遮挡过滤、主内容识别、大页面阈值等），按产物还原，不要用上游 v1.7.1 的版本替换。元素操作用 Hint 而不是序号。页面桥在主世界注入，元素拾取器是内容脚本里的浮层。
- **background**：CDP 代理按引用计数管理 attach / detach；`NetworkRecorder` 记录请求，脱敏规则和 URL 归一化原样还原；offscreen 文档承载 Schema 推断；上游 MCP 转发走 JSON-RPC 与 SSE，stdio 传输保持「未实现」的现状；数据库版本保持为 4，各张表的结构以产物为准。
- **界面与 Script 模式**：sidepanel、options、popup、Hub 四个入口页，以及 `ScriptModeAgent`、TipScript 的存储、网址匹配与自动执行。界面组件库（shadcn / radix）的用法按产物还原，样式以产物的编译结果为参照，补回上游 `index.css` 之外多出来的主题变量和自定义类。

### 分支与提交

- 只用 `main` 加 feature 分支，每批一个 feature 分支，对比脚本验收通过后合进 `main`，合并即发布，没有 develop、stage、production。
- 提交信息用英文；`CONTEXT.md` 与两条 ADR 随批次 1 一起提交。

## 涉及层与路径

> 这一节是 `ai-native-workflow` 阶段 3、4 的调度依据。

- **路径**：D（不碰 UI）。理由：这次是把已有产物还原成源码，不设计任何新页面或新组件，界面代码按产物原样还原；没有线框图，也没有 `DESIGN.md`，所以整段跳过阶段 3，不写 `AC-UI-n` 还原度验收。还原是否对，由对比脚本（AC-13）判定，不靠视觉走查。
- **涉及层**：只有这一个 WXT 工程，没有后端、没有 Storybook。按抽象层从下到上依次是 llms 与 core、page-controller 与 content、background、界面与 Script 模式。
- **设计产物**：无。不画线框图，`DESIGN.md` 不动。
- **流程说明**：本仓库只用 `main` 加 feature 分支，ai-native-workflow 的阶段 5（stage 测试）与阶段 6（production 发布）合并为「feature 分支通过对比脚本验收后合进 `main`」。

### 工单

每批的「输入」栏都明说：**本次无线框图与高保真图**。所有批次都以 `chrome/pagenter-ext-1.8.0-chrome` 为事实来源，该目录只读。

**批次 1：工程骨架与对比脚本**

- Goal：在 `chrome/pagenter/` 建出能构建的空 WXT 工程，并做出对比脚本，后面每批都靠它验收。
- 输入：原产物目录的 manifest、`_locales`、`assets`；产物里能读到的依赖版本；上游 v1.7.1 的 `package.json` 与 `wxt.config`；`CONTEXT.md` 与 ADR-0001、ADR-0002。本次无线框图与高保真图。
- 验收标准：AC-1、AC-2、AC-3、AC-4、AC-5、AC-6、AC-12、AC-14、AC-16。
- 交接物：可构建的骨架工程；lockfile；vitest 配置与第一批测试（作为后面各批的先例）；对比脚本和它的使用说明；「未改动文件表」（相对 v1.7.1 没改的文件清单，供 AC-7 使用）；构建关闭压缩的配置。

**批次 2：llms 与 core**

- Goal：还原 `src/llms` 与 `src/core`，让模型调用与 agent 主循环与产物一致。
- 输入：产物中的 `chunks/constants-*.js`（llms）与 `chunks/cards-*.js`（core、tools、MultiPageAgent）；批次 1 的对比脚本与未改动文件表；上游 v1.7.1 对应源码。本次无线框图与高保真图。
- 验收标准：AC-7（本批涉及的文件）、AC-8、AC-15（`parseAgentOutput`）、AC-16。
- 交接物：`src/llms`、`src/core` 的源码；`parseAgentOutput` 的 vitest 用例；本批的对比报告（「不同」与「仅一方有」均为空）。

**批次 3：page-controller、content 入口、页面桥与元素拾取器**

- Goal：还原页面操作层与注入页面的脚本，Hint、模拟光标、`window.__pagenter` 与元素拾取器行为不变。
- 输入：产物中的 `content-scripts/content.js`、`pagenter-bridge.js`；批次 2 的交接物；上游 v1.7.1 的 page-controller 源码。本次无线框图与高保真图。
- 验收标准：AC-7（本批涉及的文件）、AC-9、AC-16。
- 交接物：`src/page-controller` 与 content、页面桥、拾取器的源码；本批的对比报告。

**批次 4：background**

- Goal：还原 service worker 与 offscreen 文档，CDP 代理、Sniff、脱敏、Schema 推断、MCP 转发和数据库能力不变。
- 输入：产物中的 `background.js`、`chunks/offscreen-*.js`、`chunks/db-*.js`、`chunks/kvStore-*.js`、`chunks/upstreamClient-*.js`；批次 2、3 的交接物。本次无线框图与高保真图。
- 验收标准：AC-10、AC-15（Schema 推断、脱敏、URL 匹配）、AC-16、AC-17。
- 交接物：background 与 offscreen 的源码；三个纯逻辑模块的 vitest 用例；`externally_connectable` 与 `handleApiCall` 原样还原的记录；本批的对比报告。

**批次 5：界面、Script 模式与 TipScript**

- Goal：还原 sidepanel、options、popup、Hub 四个入口页，以及 Script 模式与 TipScript，完成全部还原。
- 输入：产物中的 `chunks/sidepanel-*.js`、`options-*.js`、`popup-*.js`、`hub-*.js` 及对应 html 与 css；批次 2 到 4 的交接物。本次无线框图与高保真图。
- 验收标准：AC-11、AC-13、AC-16、AC-18，并重新核对 AC-6。
- 交接物：全部界面源码；全量构建；最终对比报告（两类清单均为 0）；开发完成报告。

## 不在范围内

- 修复安全隐患（`externally_connectable` 放行 localhost、`handleApiCall` 带登录态发请求）：只记录，之后另开 feature 分支。
- 类型收紧：还原阶段允许显式 `any`，收紧另开 feature 分支逐模块做。
- 合并上游 v1.7.1 之后的更新，或改用上游 workspace 多包结构。
- 新功能、界面改版、线框图、`DESIGN.md`。
- 发布到 Chrome 应用商店；设置 develop、stage、production 分支。
- 给 UI 与 chrome API 相关代码写单元测试，Storybook、e2e 回归套件。
- 让新产物的 chunk 划分、文件名与原产物一致。
- 改动 `vscode/drag-import`。

## 补充说明

### 调研结论

- 产物由 WXT + Vite 构建，未压缩，函数名与中文注释保留，无 sourcemap。
- 逐 tag 比对结果：基线为上游 v1.7.1（v1.8.0 起的特征改动在产物中均不存在），另含 362bf82、9104064、ca197d1 三个之后的修复。这三个修复是 cherry-pick 还是独立改的，无法确定，不影响还原。
- 改动程度：SimulatorMask、checkDarkMode、getPageInfo、patches/react、llms errors 基本未改；RemotePageController、TabsController、hub-ws、db、MultiPageAgent 轻改；PageAgentCore、tools、autoFixer、OpenAIClient、dom_tree、actions 重写；`patches/antd`、ConfigPanel、`packages/ui` 已删除。

### 安全隐患记录（原样还原，之后另修）

- `externally_connectable` 放行 `http://localhost/*`：本机任意 localhost 页面都能向扩展发消息。
- `handleApiCall` 会替页面带登录态发请求：需要核实来源校验是否足够严格。

### 风险

- 对比脚本的口径可能把同名声明对应错，或因 Vite 别名还原不全产生假差异。批次 1 用构造样本把五种情况测清楚（AC-12），遇到「仅一方有」先由人判断是口径问题还是还原遗漏。
- 构建工具版本与原构建不一致时，Vite 的辅助代码（如 `__vitePreload`）可能不同。这类代码归入排除名单，不算差异，需在对比报告里列出。
- 批次 2 的 `cards-*.js` 达 1.3MB，混有 zod 与界面组件，单个 Engineer 可能装不下。若批次 2 中途发现上下文不足，停下来报告，再拆成 2a（llms）与 2b（core）。
