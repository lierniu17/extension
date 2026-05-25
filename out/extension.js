"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// ─── Logging ────────────────────────────────────────────────────
let outputChannel;
function log(...args) {
    const line = args
        .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');
    outputChannel?.appendLine(line);
    console.log(line);
}
// ─── Config ─────────────────────────────────────────────────────
const ASSET_EXTS = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp',
    'mp4', 'webm', 'ogg', 'mp3', 'wav', 'flac',
    'pdf', 'woff', 'woff2', 'ttf', 'eot',
]);
function getAliases() {
    const config = vscode.workspace.getConfiguration('dragImport');
    const aliases = config.get('aliases', { '@': 'src' }) ?? {};
    const entries = [];
    for (const [alias, dir] of Object.entries(aliases)) {
        if (typeof dir === 'string' && dir.length > 0) {
            entries.push({ alias, dir });
        }
    }
    // sort longest dir first so greedy match picks the most specific alias
    entries.sort((a, b) => b.dir.length - a.dir.length);
    log('[DragImport] loaded aliases:', entries);
    return entries;
}
// ─── Variable name generation ───────────────────────────────────
/**
 * Convert a file basename (without extension) to lowerCamelCase.
 *
 * Separators: `.`  `-`  `_`  whitespace
 *
 *   back_button_icon  →  backButtonIcon
 *   back.common.png   →  backCommon
 *   App.vue           →  App       (no separator → keep as-is)
 *   2x_icon           →  _2xIcon   (leading digit → prepend `_`)
 */
function toVarName(baseName) {
    const parts = baseName.split(/[.\-_\s]+/).filter(Boolean);
    if (parts.length === 0)
        return 'file';
    // No separator – keep original case
    if (parts.length === 1) {
        return /^[0-9]/.test(parts[0]) ? '_' + parts[0] : parts[0];
    }
    let result = parts[0].toLowerCase() +
        parts
            .slice(1)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join('');
    if (/^[0-9]/.test(result))
        result = '_' + result;
    return result;
}
/**
 * Base name for import identifiers.
 * `components/Button/index.tsx` → `Button` (not `index`).
 */
function getImportBaseName(filePath) {
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    if (baseName.toLowerCase() !== 'index') {
        return baseName;
    }
    const parentName = path.basename(path.dirname(filePath));
    if (parentName && parentName !== '.' && parentName !== '..') {
        return parentName;
    }
    return baseName;
}
// ─── Path resolution ────────────────────────────────────────────
/** Try to resolve an absolute path to an alias path. */
function toAliasPath(absolutePath, workspaceRoot, aliases) {
    if (!workspaceRoot)
        return null;
    const normalized = absolutePath.replace(/\\/g, '/');
    for (const { alias, dir } of aliases) {
        let absDir = path.resolve(workspaceRoot, dir).replace(/\\/g, '/');
        if (!absDir.endsWith('/'))
            absDir += '/';
        if (normalized.startsWith(absDir)) {
            const rest = normalized.slice(absDir.length);
            const result = alias + '/' + rest;
            log('[DragImport] alias match:', alias, '->', dir, 'result:', result);
            return result;
        }
    }
    return null;
}
/** Build the import path string — alias first, otherwise relative. */
function buildImportPath(resolvedPath, editorPath, workspaceRoot, aliases) {
    const aliasPath = toAliasPath(resolvedPath, workspaceRoot, aliases);
    if (aliasPath)
        return aliasPath;
    let rel = path
        .relative(path.dirname(editorPath), resolvedPath)
        .replace(/\\/g, '/');
    if (!rel.startsWith('.'))
        rel = './' + rel;
    return rel;
}
// ─── Import statement builder ───────────────────────────────────
function generateImport(resolvedPath, editorPath, workspaceRoot, aliases) {
    const importPath = buildImportPath(resolvedPath, editorPath, workspaceRoot, aliases);
    const ext = path.extname(resolvedPath).replace('.', '').toLowerCase();
    const baseName = getImportBaseName(resolvedPath);
    // 1. Assets
    if (ASSET_EXTS.has(ext)) {
        return `import ${toVarName(baseName)} from '${importPath}';`;
    }
    // 2. Vue SFC
    if (ext === 'vue') {
        const v = toVarName(baseName);
        const pascal = v.charAt(0).toUpperCase() + v.slice(1);
        return `import ${pascal} from '${importPath}';`;
    }
    // 3. React TSX / JSX
    if (ext === 'tsx' || ext === 'jsx') {
        const v = toVarName(baseName);
        const pascal = v.charAt(0).toUpperCase() + v.slice(1);
        return `import ${pascal} from '${importPath}';`;
    }
    // 4. TS / JS modules
    if (['ts', 'js', 'mjs', 'cjs', 'cts', 'mts'].includes(ext)) {
        return `import { ${toVarName(baseName)} } from '${importPath}';`;
    }
    // 5. Everything else – side-effect import
    return `import '${importPath}';`;
}
// ─── File extraction from DataTransfer ──────────────────────────
function tryGetFiles(dataTransfer) {
    const mimeTypes = [
        'text/uri-list',
        'application/vnd.code.resourceurl',
        'text/plain',
    ];
    for (const mime of mimeTypes) {
        try {
            const item = dataTransfer.get(mime);
            if (!item)
                continue;
            let rawVal = item;
            if (typeof item === 'object' && item !== null && 'value' in item) {
                rawVal = item.value;
            }
            const files = [];
            // Array of URIs / objects
            if (Array.isArray(rawVal)) {
                for (const entry of rawVal) {
                    try {
                        if (typeof entry === 'string') {
                            if (entry.startsWith('file://')) {
                                files.push(vscode.Uri.parse(entry).fsPath);
                            }
                        }
                        else if (entry && typeof entry === 'object') {
                            const obj = entry;
                            if (obj.fsPath)
                                files.push(obj.fsPath);
                            else if (obj.path?.startsWith('file://'))
                                files.push(vscode.Uri.parse(obj.path).fsPath);
                            else if (obj.external)
                                files.push(vscode.Uri.parse(obj.external).fsPath);
                        }
                    }
                    catch {
                        /* skip malformed entry */
                    }
                }
            }
            // String of URI(s), one per line
            else if (typeof rawVal === 'string') {
                for (const line of rawVal.split(/\r?\n/).filter(Boolean)) {
                    try {
                        if (line.startsWith('file://')) {
                            files.push(vscode.Uri.parse(line).fsPath);
                        }
                    }
                    catch {
                        /* skip */
                    }
                }
            }
            // Single object
            else if (rawVal && typeof rawVal === 'object') {
                const obj = rawVal;
                if (obj.fsPath)
                    files.push(obj.fsPath);
                else if (obj.path?.startsWith('file://'))
                    files.push(vscode.Uri.parse(obj.path).fsPath);
                else if (obj.external)
                    files.push(vscode.Uri.parse(obj.external).fsPath);
            }
            log('[DragImport] files found:', files.length);
            if (files.length > 0)
                return files;
        }
        catch (e) {
            log('[DragImport] ERROR processing mime', mime, ':', e.message);
        }
    }
    return [];
}
// ─── Activation ─────────────────────────────────────────────────
function activate(context) {
    outputChannel = vscode.window.createOutputChannel('Drag Import');
    context.subscriptions.push(outputChannel);
    log('[DragImport] Plugin activated');
    // ── DocumentDropEditProvider (Shift+drag) ─────────────────────
    const selector = { scheme: 'file' };
    const dropProvider = {
        async provideDocumentDropEdits(document, _position, dataTransfer, _token) {
            log('[DragImport] ===== provideDocumentDropEdits =====');
            const files = tryGetFiles(dataTransfer);
            if (files.length === 0)
                return undefined;
            const editorPath = document.uri.fsPath;
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
            const aliases = getAliases();
            const imports = files
                .map((f) => generateImport(f, editorPath, workspaceRoot, aliases))
                .join('\n');
            log('[DragImport] generated:', imports);
            return {
                title: 'Import statement',
                insertText: new vscode.SnippetString(imports),
            };
        },
    };
    context.subscriptions.push(vscode.languages.registerDocumentDropEditProvider(selector, dropProvider));
    log('[DragImport] DocumentDropEditProvider registered');
    // ── convertToImport command (Cmd+Option+I) ────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('dragImport.convertToImport', async () => {
        log('[DragImport] ===== Command triggered =====');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Drag Import: No active editor');
            return;
        }
        const doc = editor.document;
        const selection = editor.selection;
        let inputText = '';
        let replaceRange = selection;
        if (selection.isEmpty) {
            const line = doc.lineAt(selection.active.line);
            inputText = line.text.trim();
            replaceRange = line.range;
        }
        else {
            inputText = doc.getText(selection);
        }
        log('[DragImport] inputText:', inputText);
        if (!inputText) {
            vscode.window.showInformationMessage('Drag Import: First drag a file (without modifier), then press Cmd+Option+I');
            return;
        }
        const trimmed = inputText.replace(/["']/g, '').trim();
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
        const aliases = getAliases();
        let resolved = null;
        // 1. Absolute path
        if (trimmed.startsWith('/')) {
            if (fs.existsSync(trimmed))
                resolved = trimmed;
        }
        // 2. Reverse alias lookup
        if (!resolved && workspaceRoot) {
            for (const { alias, dir } of aliases) {
                const prefix = alias + '/';
                if (trimmed.startsWith(prefix)) {
                    const candidate = path.resolve(workspaceRoot, dir, trimmed.slice(prefix.length));
                    if (fs.existsSync(candidate)) {
                        resolved = candidate;
                        log('[DragImport] reverse alias resolved:', candidate);
                        break;
                    }
                }
            }
        }
        // 3. Relative path
        if (!resolved) {
            const absPath = path.resolve(path.dirname(doc.uri.fsPath), trimmed);
            if (fs.existsSync(absPath))
                resolved = absPath;
        }
        if (!resolved) {
            vscode.window.showWarningMessage(`Drag Import: File not found — ${trimmed}`);
            return;
        }
        const importStmt = generateImport(resolved, doc.uri.fsPath, workspaceRoot, aliases);
        await editor.edit((eb) => eb.replace(replaceRange, importStmt));
        log('[DragImport] Done:', importStmt);
    }));
    log('[DragImport] All providers registered');
}
function deactivate() {
    outputChannel?.dispose();
}
//# sourceMappingURL=extension.js.map