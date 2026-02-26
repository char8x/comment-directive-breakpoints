# Comment Directive Breakpoints

[![Download](https://img.shields.io/visual-studio-marketplace/d/char8x.comment-directive-breakpoints)](https://marketplace.visualstudio.com/items?itemName=char8x.comment-directive-breakpoints)
[![Download VSIX](https://img.shields.io/badge/Download-VSIX-blue?logo=visualstudiocode)](https://github.com/char8x/comment-directive-breakpoints/releases/latest)
![Version](https://img.shields.io/visual-studio-marketplace/v/char8x.comment-directive-breakpoints)

通过源代码中的注释指令直接生成和管理 VS Code 断点。

![概览](./media/overview.gif)

## 功能与使用方法

> [!TIP]
> VS Code 自带的 [JavaScript Debug Terminal](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_javascript-debug-terminal) 非常实用！配合该扩展，您可以无需任何 `launch.json` 配置即可轻松调试 Node.js / 前端项目

### 1. 基于指令的断点

使用简单的注释设置标准断点、条件断点、命中计数断点或日志点。只需添加以 `// @bp`（或适合您语言的注释风格）开头的注释，后跟可选指令。

#### 基础断点

在相关的代码行设置标准断点。

```typescript
// @bp
const value = calculate();
```

![基础断点](./media/basic.png)

#### 日志断点 (@bp.log)

命中断点时将消息记录到调试控制台。使用 `{}` 进行表达式插值。

```typescript
// @bp.log {user.id} with {Math.random()}
login(user);
```

![日志点](./media/logpoint.png)

#### 条件断点 (@bp.expr)

仅当表达式计算结果为 true 时才中断执行。

```typescript
for (let i = 0; i < 5; i++) {
  // @bp.expr i > 3
  console.log('index:', i);
}
```

![条件断点](./media/conditional-bp.png)

#### 命中计数断点 (@bp.hit)

当满足命中计数条件（例如 `> 5`, `== 10`）时中断执行。

```typescript
for (let i = 0; i < 5; i++) {
  // @bp.hit > 2
  console.log('index:', i);
}
```

![命中计数断点](./media/hit-count.png)

#### 禁用断点 (.disable)

在任何指令后添加 `.disable` 以创建一个初始禁用的断点。

```typescript
// @bp.disable
// @bp.hit.disable 5
// @bp.log.disable value: {v}
```

![禁用断点](./media/disabled-bp.png)

### 2. 实时更新

保存文件时自动更新断点。

当 `settings.json` 配置如下时，扩展将完全接管当前文件中断点的生成和移除。

```json
{
  "comment-directive-breakpoints.general.generateOnSave": true,
  "comment-directive-breakpoints.general.breakpointManagementMode": "replace"
}
```

![实时更新](./media/realtime-update.gif)

### 3. 智能自动补全

在编写 `@bp.log` 或 `@bp.expr` 指令时，为您提供针对表达式的上下文感知代码补全建议。

![智能自动补全](./media/smart-autocompletion.png)

### 4. 扫描工作区与打开的文件

自动发现并生成整个工作区中或当前打开文件里的断点。

#### 扫描工作区

**命令:** `Comment Directive Breakpoints: Generate for Workspace`
扫描整个工作区中的注释指令并生成断点。

![扫描工作区](./media/workspace-scan.gif)

#### 扫描打开的文件

**命令:** `Comment Directive Breakpoints: Generate for Opened Files`
仅扫描当前在编辑器中打开的文件。

![扫描打开的文件](./media/opened-files-scan.gif)

## 配置项

您可以在 `settings.json` 中配置该扩展：

```json
{
  "comment-directive-breakpoints.general.generateOnSave": true,
  "comment-directive-breakpoints.general.supportedLanguages": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact",
    "python",
    "go",
    "ruby",
    "java",
    "rust"
  ],
  "comment-directive-breakpoints.general.breakpointManagementMode": "append",
  "comment-directive-breakpoints.ripgrep.path": ""
}
```

## 支持的语言

该扩展目前仅支持内置了 Tree-Sitter WASM 解析器的语言。暂不支持其他语言。

目前支持的语言：

- JavaScript / TypeScript / JSX / TSX
- Python
- Go
- Rust
- Java
- Ruby

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

[MIT](LICENSE)
