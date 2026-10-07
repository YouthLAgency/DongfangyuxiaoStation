---
name: "astro-content-admin"
description: "为 Astro 内容集合站点构建完整后台管理系统（仪表盘+各板块CRUD+GitHub一键提交）。当用户需要为 Astro 静态站搭建可视化内容管理后台、实现内容增删改查与直接提交到仓库时调用。"
---

# Astro 站点后台管理系统

为基于 Astro Content Collections 的静态站点构建完整的后台管理系统，覆盖内容的增删改查与一键提交到 GitHub 仓库。

## 后台整体架构

```
/admin/                    仪表盘：内容统计 + 快捷入口
├── /admin/guide/          入门指南管理（列表 + 新增/编辑）
├── /admin/theory/         理论文章管理（列表 + 新增/编辑）
├── /admin/concepts/       概念词典管理（列表 + 新增/编辑）
├── /admin/art/            文艺作品管理（列表 + 新增/编辑，含 bilibili）
├── /admin/journal/        期刊通讯管理（列表 + 新增/编辑，含下载链接）
├── /admin/tools/          左翼工具管理（列表 + 新增/编辑）
└── /admin/contact/        联络站编辑（组织表、联系方式等配置）
```

## 核心功能

### 1. GitHub API 集成（一键提交）

所有内容操作通过 GitHub Contents API 直接读写仓库，无需后端：

- **认证**：用户在后台填入 GitHub Personal Access Token，存 `localStorage`（`gh_token`），不发送到任何第三方
- **仓库配置**：`owner`、`repo`、`branch` 存 `localStorage`（`gh_owner`、`gh_repo`、`gh_branch`）
- **创建/更新文件**：`PUT /repos/{owner}/{repo}/contents/{path}`，body 含 `message`、`content`（base64）、`branch`，更新时需 `sha`
- **获取文件列表**：`GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` 返回目录下文件
- **获取文件内容**：`GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` 返回 `content`（base64）+ `sha`
- **删除文件**：`DELETE /repos/{owner}/{repo}/contents/{path}`，需 `sha`

**安全约束**：token 仅存浏览器 localStorage，不写入代码、不提交到仓库。

### 2. 内容列表页（每个板块）

- 从 GitHub API 获取 `src/content/<集合>/` 下的 `.md` 文件列表
- 表格展示：标题/术语/名称、日期、类型/分类、操作（编辑、删除）
- "新增"按钮跳转到表单页
- 列表项支持搜索/过滤（前端过滤）

### 3. 内容编辑页（每个板块）

- 新增模式：空表单，按 schema 预填默认值
- 编辑模式：从 GitHub API 拉取文件内容，解析 frontmatter 填入表单
- 表单字段严格匹配 `content/config.ts` schema
- 实时预览生成的 Markdown
- 操作按钮：
  - **提交到 GitHub**：调用 PUT API 创建/更新文件，成功后返回列表
  - **下载 .md**：本地下载
  - **复制 Markdown**：复制到剪贴板

### 4. 各板块特殊功能

| 板块 | 特殊字段/功能 |
|---|---|
| 入门指南 | `type` 枚举（阅读路径/概念入门/推荐书单/社员招募/通讯员征集）、`order` 排序 |
| 理论文章 | `category` 枚举、`source` 枚举（原创/译文/转载） |
| 概念词典 | 无 `date` 字段，按 `category` 分组展示 |
| 文艺作品 | `bilibili` BV号字段、`type` 含美术/音乐/戏剧 |
| 期刊通讯 | `issue` 期号、`downloadUrl` 下载链接、`onlineReadable` 在线阅读开关 |
| 左翼工具 | `url` 官网链接、`recommended` 推荐标记 |
| 联络站 | 非内容集合，编辑 `src/pages/contact.astro` 中的组织表数据 |

### 5. 联络站管理

联络站是静态页面（`src/pages/contact.astro`），不是内容集合。后台提供：
- 中国左翼组织表编辑（增删行）
- 国际左翼组织表编辑（增删行）
- 联系方式编辑
- 投稿通道信息编辑
- 提交时直接更新 `contact.astro` 文件

## 核心原则

1. **字段契约必须与 schema 一一对应**：每个表单字段的 name、type、默认值、枚举选项都必须来自 `content/config.ts`。

2. **Frontmatter 序列化严格规范**：
   - YAML frontmatter 包裹在 `---` 之间
   - 字符串含特殊字符（`:`、`#`、`&`、引号）时用双引号包裹
   - 数组用 YAML 列表语法 `- item`
   - 布尔值用 `true`/`false`，日期 `YYYY-MM-DD`
   - 可选字段留空时**不写入** frontmatter
   - 正文紧跟 frontmatter 后，空一行再开始

3. **幂等提交**：创建和更新用同一个 `PUT` 接口，更新时必须传 `sha`（从 GET 获取），避免重复提交冲突。

4. **复用现有样式**：颜色用 `text-primary`、`bg-gold`、`border-primary` 等已定义的 Tailwind 类；布局用 `max-w-content mx-auto px-4`。不引入未定义的颜色。

5. **客户端脚本用 `is:inline`**：所有 `<script>` 必须加 `is:inline`，事件监听加标记位防止重复初始化。

## 字段映射表

| Zod schema | 表单控件 | 序列化 |
|---|---|---|
| `z.string()` | `<input type="text">` | 字符串，特殊字符加引号 |
| `z.string().url()` | `<input type="url">` | URL 字符串 |
| `z.date()` | `<input type="date">` | `YYYY-MM-DD` |
| `z.number()` | `<input type="number">` | 数字 |
| `z.boolean()` | `<input type="checkbox">` | `true`/`false` |
| `z.enum([...])` | `<select>` | 选中的枚举值 |
| `z.array(z.string())` | 标签输入（逗号分隔） | `- a\n- b` |
| `.default(x)` | 预填 x | 写入 |
| `.optional()` | 允许留空 | 留空则不写入 |

## 标准工作流

1. 读取 `src/content/config.ts`，梳理每个集合的字段
2. 在 `src/pages/admin/` 下创建各板块页面（index 仪表盘 + 各板块列表/编辑）
3. 每个板块：列表页（GitHub API 拉取文件列表）+ 编辑页（表单 + 预览 + 提交）
4. 顶部统一导航：返回仪表盘、各板块入口、GitHub 配置
5. GitHub 配置面板：token、owner、repo、branch 输入，存 localStorage

## 反模式

- 字段名与 schema 不一致 → Zod 校验失败
- 枚举选项不在 schema 列表内 → Zod 解析错误
- 可选字段空值写成 `field: ` 留空 → 解析为 null
- 更新文件时未传 `sha` → GitHub API 409 冲突
- token 硬编码在代码中 → 安全风险
- 引入未定义的 Tailwind 颜色 → 样式静默失效

## 文件产物

- `src/pages/admin/index.astro`：仪表盘
- `src/pages/admin/[collection]/index.astro`：内容列表页（动态路由）
- `src/pages/admin/[collection]/[slug].astro`：内容编辑页（动态路由）
- `src/pages/admin/contact/index.astro`：联络站编辑页
- `src/pages/admin/settings/index.astro`：GitHub 配置页
