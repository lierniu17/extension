# Drag Import

拖入文件自动生成 `import` 语句的 VS Code / Cursor 扩展。

支持 **Vue / React (TSX/JSX) / TypeScript / JavaScript**，并支持 `@` 等路径别名（类似 Vite `resolve.alias`）。

## 功能

| 拖入文件类型 | 生成示例 |
|---|---|
| 图片 / 字体等资源 | `import backButtonIcon from '@/assets/back-button.png';` |
| `Foo.vue` | `import Foo from '@/components/Foo.vue';` |
| `Bar.tsx` / `Bar.jsx` | `import Bar from '@/components/Bar.tsx';` |
| `util.ts` / `util.js` | `import { util } from '@/utils/util.ts';` |
| `Button/index.tsx` 等 **index** 文件 | 使用**父目录名**作为符号，如 `import Button from '@/components/Button/index.tsx';` |
| 其他类型 | `import './path/to/file';`（side-effect） |

### 命名规则摘要

- **资源文件**：按文件名生成 lowerCamelCase（`back-button.png` → `backButton`）
- **Vue / TSX / JSX**：PascalCase 默认导出
- **TS / JS**：named import（`import { name } from '...'`）
- **index 文件**：符号名取上一级目录名（`components/Button/index.vue` → `Button`）

## 使用方法

### Shift + 拖放（推荐）

1. 打开任意项目内的代码文件（`file` scheme）
2. 从 **资源管理器** 或 **系统文件管理器** 拖入目标文件
3. **按住 Shift** 再松手，将内容插入当前编辑器（而不是新开标签）
4. 若出现多个选项，选择 **Import statement**

> 需开启 `editor.dropIntoEditor.enabled`（VS Code / Cursor 新版通常默认已开启）。拖过编辑器区域时一般会提示 Hold **⇧** to drop into editor。

### 路径转 import（命令）

将编辑器中的路径文本转为 import 语句：

1. 选中路径，或将光标放在包含路径的那一行
2. 运行命令 **Convert to Import**，或按 `Cmd+Alt+I`（macOS）/ `Ctrl+Alt+I`（Windows / Linux）

支持绝对路径、相对路径，以及已在设置中配置的别名路径（如 `@/components/Foo`）。

## 配置

在设置中搜索 `dragImport`：

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `dragImport.aliases` | `object` | `{ "@": "src" }` | 路径别名。文件落在别名目录下时使用别名路径，否则使用相对路径 |

示例（`settings.json`）：

```json
{
  "dragImport.aliases": {
    "@": "src",
    "@components": "src/components",
    "~": "./"
  }
}
```

## 安装

### 从 VSIX 安装（本地 / 离线）

```bash
# VS Code
code --install-extension drag-import-1.0.0.vsix

# Cursor
cursor --install-extension drag-import-1.0.0.vsix
```

或在扩展面板：**⋯** → **Install from VSIX...**

### 从 Marketplace 安装

在扩展市场搜索 **Drag Import**（发布者：`lierniu`）。

## 开发

需要 **Node.js 20+**（打包工具 `vsce` 在 Node 18 下会报错）。项目含 `.nvmrc`：

```bash
git clone https://github.com/SZGG2333/cursor-extension.git
cd cursor-extension
nvm use
npm install
npm run compile
```

在 VS Code 中按 **F5** 启动 Extension Development Host 进行调试。

```bash
npm run watch   # 监听编译
npm run package # 生成 .vsix
```

## 发布维护者

```bash
nvm use
npx vsce login lierniu
npm run package
npx vsce publish
```

发布前请确认：`LICENSE`、`repository`、Marketplace Publisher 与 PAT 已就绪。

## 要求

- VS Code **1.84+** 或兼容的 Cursor 版本
- `editor.dropIntoEditor.enabled`: `true`

## License

[MIT](LICENSE)
