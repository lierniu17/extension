# 开发完成报告 · 批次 1：工程骨架与对比脚本

- **feature 分支**：`feature/pagenter-batch1-skeleton`（已合入 `main`，合并提交 `5c3c8cd`）
- **spec**：`docs/specs/2026-11-16-pagenter-reverse.md`
- **复验**：`pnpm verify` 在 worktree 中独立重跑通过（构建、类型检查、`check:any`、vitest 61/61、对比脚本）

## 验收标准

| AC | 结果 | 证据 |
| --- | --- | --- |
| AC-1 | 通过 | 空目录按 lockfile 安装与构建均退出 0，24 个产物文件与 worktree 构建逐字节一致；BOT-1 由用户在 Chrome 加载，无报错、图标出现 |
| AC-2 | 通过 | 原产物 36 个文件哈希与 `main` 一致；`git status` 与 `git diff` 均无改动 |
| AC-3 | 通过 | lockfile 已提交；React 19.2.4、zod 4.3.6、ai-motion 0.4.8 与产物一致，其余锁在上游 v1.7.1 解析的版本；Vite 锁定 7.3.1 |
| AC-4 | 通过 | 关闭压缩；构建产物保留函数名与中文注释 |
| AC-5 | 通过 | 上游 MIT LICENSE 原文放在 `chrome/pagenter/LICENSE`（按用户决定，spec 已同步改写） |
| AC-6 | 通过 | manifest 字段差异 0，文件清单差异 0；`externally_connectable` 保持原样 |
| AC-12 | 通过 | 对比脚本 16 个测试，覆盖 spec 的 5 种情况外加 6 种边界情况 |
| AC-14 | 通过 | 第三方库两侧都被排除；版本不一致 0 |
| AC-16 | 通过 | `strict: true`，`tsc --noEmit` 退出 0；缺 `TODO(types)` 的文件 0 个 |

## 对比基准（占位构建 vs 原产物）

| 相同 | 不同 | 仅原产物有 | 仅新产物有 | 排除（原/新） |
| --- | --- | --- | --- | --- |
| 4 | 7 | 1949 | 7 | 1287 / 65 |

「仅原产物有」中 1404 条在 `cards` chunk。其中相当一部分是 Pagenter 自己引入、上游没有的库（如 CodeMirror），后续批次加成依赖后会从清单中消失。

## 交接给批次 2

- 对比命令：在 `chrome/pagenter/` 下 `pnpm build && pnpm compare`，报告在 `.output/compare/report.md`
- 「未改动文件表」：`chrome/pagenter/docs/unchanged-files.json`，85 个上游文件中 10 个未改动
- 对比口径：只差末尾数字的标识符（如 `x1` / `x2`）视为相同，见 `chrome/pagenter/README.md`
- 环境：仓库根 `.nvmrc` 改为 22（测试与对比脚本需要 Node 22.12+）
- 注释：esbuild 会丢掉函数体内语句级注释、保留对象字面量内注释，原产物同样如此
