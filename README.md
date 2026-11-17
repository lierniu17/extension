# extension

本仓库收录本地使用的浏览器扩展与编辑器扩展。

| 目录 | 扩展 | 说明 |
|---|---|---|
| [`chrome/pagenter`](chrome/pagenter) | Pagenter 1.8.0 | AI 驱动的浏览器自动化助手，用自然语言控制网页；从原产物逆向还原出的 WXT 工程，见 [chrome/pagenter/README.md](chrome/pagenter/README.md) |
| [`vscode/drag-import`](vscode/drag-import) | Drag Import 1.0.0 | 在 VS Code / Cursor 中拖入文件，自动生成 `import` 语句 |

## Pagenter

Chrome Manifest V3 扩展（含弹窗、侧边栏、设置页与 Hub），界面语言为英文和简体中文。源码在 `chrome/pagenter`；原产物 `chrome/pagenter-ext-1.8.0-chrome` 在逆向完成后已删除，需要时从 git 历史取回。

在 Chrome 中加载：

1. 在 `chrome/pagenter` 下执行 `pnpm install` 和 `pnpm build`
2. 打开 `chrome://extensions`
3. 打开右上角 **开发者模式**
4. 选择 **加载已解压的扩展程序**
5. 选中 `chrome/pagenter/.output/pagenter-ext-1.8.0-chrome`

加载后点击工具栏图标打开弹窗，也可从扩展菜单打开侧边栏或设置页。

## Drag Import

把文件拖进编辑器并按住 Shift，按文件类型生成 `import`。支持 Vue、React（TSX/JSX）、TypeScript、JavaScript，以及 `@` 等路径别名。

功能、配置、调试和打包见 [vscode/drag-import/README.md](vscode/drag-import/README.md)。

在该目录下开发：

```bash
cd vscode/drag-import
nvm use          # 仓库根目录 .nvmrc 为 Node.js 22
npm install
npm run compile  # 或 npm run watch
```

在 VS Code / Cursor 中对该目录按 **F5** 启动 Extension Development Host。打包：

```bash
npm run package  # 生成 .vsix
```

## 许可

Drag Import 使用 [MIT](vscode/drag-import/LICENSE)。Pagenter 还原源码保留上游 alibaba/page-agent 的 [MIT LICENSE](chrome/pagenter/LICENSE)。
