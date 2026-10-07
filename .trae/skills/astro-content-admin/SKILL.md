---
name: "astro-content-admin"
description: "为 Astro 内容集合站点构建图形化内容管理平台。当用户需要为 Astro 静态站添加可视化的内容录入/管理界面、生成可提交到 src/content/ 的 Markdown 文件时调用。"
---

# Astro 内容管理平台构建

为基于 Astro Content Collections 的静态站点构建一个图形化内容管理平台，用于录入、校验并生成可提交到 `src/content/` 的 Markdown 内容文件。

## 适用场景

- Astro 静态站点使用 `src/content/config.ts` 定义内容集合（guide/articles/art/journals/concepts/tools 等）
- 需要一个 `/admin` 页面，让非技术用户也能录入内容
- 生成的内容需严格匹配 `content/config.ts` 中的 Zod schema（字段名、枚举值、默认值、可选性）
- 纯前端实现：浏览器内生成 Markdown，提供"下载 .md 文件"和"一键复制"，不依赖后端

## 核心原则

1. **字段契约必须与 schema 一一对应**：每个表单字段的 name、type、默认值、枚举选项都必须来自 `content/config.ts`，不能凭空造字段。`date` 用 `z.date()` 对应日期选择器，`z.enum(...)` 对应下拉框，`z.array(z.string())` 对应标签输入，`z.boolean()` 对应复选框，`.optional()` 的字段允许留空，`.default()` 的字段预填默认值。

2. **Frontmatter 序列化严格规范**：
   - YAML frontmatter 包裹在 `---` 之间
   - 字符串值含特殊字符（`:`、`#`、`&`、引号）时用双引号包裹
   - 数组用 YAML 列表语法 `- item` 或内联 `[a, b]`
   - 布尔值用 `true`/`false`
   - 日期格式 `YYYY-MM-DD`
   - 可选字段留空时**不写入** frontmatter（避免 null 值）
   - 正文（Markdown body）紧跟在 frontmatter 之后，空一行再开始

3. **体验闭环：录入 → 预览 → 下载/复制**：
   - 左侧（或顶部）是表单，右侧（或底部）实时预览生成的 Markdown
   - 提供"下载 .md 文件"按钮（Blob + download 属性），文件名建议用 slug（标题转拼音或短横线化）
   - 提供"复制 Markdown"按钮（navigator.clipboard）
   - 表单校验：必填字段为空时给出错误提示，不生成文件

4. **多集合切换**：用 Tab 或下拉框在不同内容集合之间切换，每个集合渲染对应的表单。集合列表从 `collections` 的 key 推导。

5. **复用现有样式体系**：颜色用 `text-primary`、`bg-gold`、`border-primary` 等已定义的 Tailwind 类；布局用 `max-w-content mx-auto px-4`；按钮用 `bg-primary text-white rounded hover:opacity-90`。不要引入新的 CSS 变量或未定义的颜色。

6. **客户端脚本用 `is:inline` 且幂等**：所有 `<script>` 必须加 `is:inline`（Astro 不打包页面内脚本）。事件监听用 `DOMContentLoaded`，并加标记位防止重复初始化。

## 标准工作流

1. 读取 `src/content/config.ts`，梳理每个集合的字段（name、type、enum、default、optional）
2. 在 `src/pages/admin/index.astro` 创建管理页面
3. 顶部集合切换器（Tab 列表）
4. 每个集合一个表单区，字段按 schema 生成
5. 实时预览 Markdown（`<pre>` 或 `<textarea readonly>`）
6. 下载 + 复制按钮
7. 可选：GitHub API 直接提交（需用户提供 token，存 localStorage，调用 `PUT /repos/{owner}/{repo}/contents/{path}`）

## 字段映射表

| Zod schema | 表单控件 | 序列化 |
|---|---|---|
| `z.string()` | `<input type="text">` | 原样字符串，特殊字符加引号 |
| `z.string().url()` | `<input type="url">` | URL 字符串 |
| `z.date()` | `<input type="date">` | `YYYY-MM-DD` |
| `z.number()` | `<input type="number">` | 数字 |
| `z.boolean()` | `<input type="checkbox">` | `true`/`false` |
| `z.enum([...])` | `<select>` | 选中的枚举值 |
| `z.array(z.string())` | 标签输入（逗号分隔转数组） | `- a\n- b` |
| `.default(x)` | 预填 x | 写入 |
| `.optional()` | 允许留空 | 留空则不写入 |

## 反模式

- 字段名与 schema 不一致（如把 `issue` 写成 `issue_no`）→ 构建时 Zod 校验失败
- 枚举选项不在 schema 枚举列表内 → Zod 解析错误
- 可选字段空值写成 `field: ` 留空 → 解析为 null，可能报错
- 表单提交没有客户端校验 → 生成的 .md 文件无法通过 schema 校验
- 引入未定义的 Tailwind 颜色（如 `bg-blue-500`）→ 样式静默失效

## 文件产物

- `src/pages/admin/index.astro`：管理平台主页面（集合切换 + 表单 + 预览 + 下载/复制）
- 如有需要，可拆分 `src/components/admin/FormField.astro`、`src/components/admin/MarkdownPreview.astro` 等组件
