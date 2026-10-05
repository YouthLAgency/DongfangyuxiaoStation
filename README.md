# 东方欲晓——马列毛主义通讯站

> 为困惑中的青年点亮一盏灯。

青联社官方网站，兼具左翼青年入门指南、理论文艺展板与资源集散地功能。

## 一、网站概况

| 项目 | 内容 |
|------|------|
| 名称 | 东方欲晓——马列毛主义通讯站 |
| 简称 | 东方欲晓 |
| 定位 | 青联社官方网站 + 左翼青年入门指南 + 理论文艺展板 + 资源集散地 |
| 目标用户 | 对现状有困惑的青年、左翼学习者、创作者、通讯员 |
| 核心功能 | 对外展示、理论资源、文艺作品、刊物阅读、工具导航、投稿互动 |
| 部署平台 | Cloudflare Pages |
| 代码仓库 | https://github.com/YouthAgency/DongfangyuxiaoStation.git |

## 二、技术栈与实现原理

### 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Astro 4 | 静态站点生成，组件化，支持 Markdown/MDX |
| 样式 | Tailwind CSS 3 | 原子化 CSS，快速开发 |
| 内容管理 | Markdown + Astro Content Collections | 内置内容集合，类型安全 |
| 部署 | Cloudflare Pages | 全球 CDN、自动 HTTPS、Git 推送即部署 |
| 代码托管 | GitHub | 版本控制与协作 |
| 其他集成 | @astrojs/mdx、@astrojs/sitemap | MDX 支持、自动生成站点地图 |

### 2.2 实现原理

1. **静态站点生成（SSG）**：Astro 在构建时将所有页面预渲染为静态 HTML，部署到 CDN 后无需服务器运行，加载速度快、安全性高、成本低。

2. **内容集合（Content Collections）**：文章、文艺作品、刊物、概念词典等内容以 Markdown 文件存放在 `src/content/` 下，通过 `src/content/config.ts` 定义 Schema，Astro 自动生成类型并校验。新增内容只需新建 Markdown 文件，无需改代码。

3. **组件化布局**：`src/layouts/BaseLayout.astro` 定义全局页面骨架（Header + main + Footer），各页面复用该布局，保证视觉一致。

4. **Tailwind 原子化样式**：通过 `tailwind.config.mjs` 定义主题色（赤红 `primary`、墨黑 `ink` 等），页面直接使用工具类，减少重复 CSS。

5. **Git 驱动部署**：代码推送到 GitHub `main` 分支后，Cloudflare Pages 自动拉取、构建并部署，形成「编辑 → 提交 → 上线」的闭环。

### 2.3 与一般静态网站的区别

一般静态网站（手写 HTML、Hexo、Hugo 等）通常只是「把 Markdown 渲染成 HTML 页面」；本项目基于 Astro 的现代静态站点方案，在以下方面有本质区别：

| 对比维度 | 一般静态网站 | 本项目（Astro） |
|----------|--------------|-----------------|
| **内容管理** | Markdown 文件平铺，无校验，frontmatter 写错也不会报错 | Content Collections 在 `config.ts` 中定义 TypeScript Schema，构建时自动校验字段类型与必填项，内容写错直接构建失败 |
| **路由生成** | 每页需手动创建文件，或按目录约定生成 | 动态路由 `[...slug].astro` 自动遍历内容集合生成详情页，新增文章只需放一个 `.md` 文件，无需改页面代码 |
| **客户端 JS** | 多数框架（Next/Gatsby）即使页面静态，也会向客户端下发整套 React/Vue 运行时 | Astro 默认「零 JS」输出；仅在需要交互的组件上按需水合（Islands 架构），首屏 JS 体积极小 |
| **组件复用** | 模板语言有限，跨页面复用靠 include/partial | 用 `.astro` 组件 + 布局（Layout）组合，可直接混入 React/Vue/Svelte 组件，框架无关 |
| **内容查询** | 只能按文件路径读取，难以跨文章筛选/排序 | 内容可像数据库一样查询：`getCollection('articles').filter(...)`，轻松实现「最新文章」「按分类筛选」等列表 |
| **开发体验** | 改完 Markdown 需手动刷新或依赖简单热更新 | 开发服务器即时热更新，类型错误在终端实时提示 |

**一句话总结**：一般静态网站是「把文本排成网页」，本项目是「用类型安全的内容集合驱动一个零运行时开销的组件化站点」——既保留了静态站的极速与安全，又具备了接近动态站点的内容组织能力。

## 三、项目结构

```
dongfangyuxiao/
├── src/
│   ├── components/          # 可复用组件（Header、Footer 等）
│   ├── content/             # 内容集合
│   │   ├── articles/        # 理论文章（.md）
│   │   ├── art/             # 文艺作品
│   │   ├── journals/        # 刊物
│   │   ├── concepts/        # 概念词典
│   │   └── config.ts        # 内容集合 Schema 定义
│   ├── layouts/             # 页面布局
│   │   └── BaseLayout.astro
│   ├── pages/               # 页面（按路由组织）
│   │   ├── index.astro      # 首页
│   │   ├── about.astro      # 关于
│   │   ├── contact.astro    # 联络站
│   │   ├── guide/           # 入门指南
│   │   ├── theory/          # 理论中心（含 [slug] 详情页）
│   │   ├── art/             # 文艺阵地
│   │   ├── journal/         # 刊物
│   │   └── tools/           # 工具导航
│   └── styles/
│       └── global.css       # 全局样式
├── public/                  # 静态资源（favicon 等）
├── astro.config.mjs         # Astro 配置
├── tailwind.config.mjs      # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
└── package.json
```

## 四、本地开发

### 环境要求

- Node.js ≥ 18（推荐 22 LTS）

### 启动开发服务器

```bash
npm install
npm run dev
```

访问 `http://localhost:4321` 预览。

### 构建与预览

```bash
npm run build      # 生成静态站点到 dist/
npm run preview    # 本地预览构建产物
```

## 五、部署到 Cloudflare Pages

1. 推送代码到 GitHub `main` 分支。
2. 在 Cloudflare Dashboard → Workers 和 Pages → 创建 → Pages → 连接 Git。
3. 选择仓库，构建设置：
   - 框架预设：`Astro`
   - 构建命令：`npm run build`
   - 构建输出目录：`dist`
4. 部署后获得 `*.pages.dev` 域名，可在「自定义域」中绑定自有域名。

## 六、内容更新规范

- 新增文章：在 `src/content/articles/` 下新建 `.md` 文件，遵循 config.ts 中的 frontmatter 规范。
- 提交信息遵循：`feat` / `fix` / `content` / `style` / `docs` / `chore` 前缀。
- 网站只发布公开级内容，不涉及组织内部信息与成员真实身份。

## 七、更新日志

### 2026-10-05
- `feat`: 初始化项目脚手架（Astro 4 + Tailwind CSS 3 + MDX + Sitemap）。
- `feat`: 搭建基础布局 BaseLayout、Header、Footer 组件。
- `feat`: 完成首页、关于、联络站及各板块占位页。
- `feat`: 配置内容集合（articles / art / journals / concepts）及示例文章。
- `style`: 导航栏与页脚链接字色调整为白色/灰色，修复全局红色链接覆盖问题。
- `docs`: 编写 README.md，阐述网站概况与实现原理。
- `docs`: README 新增「与一般静态网站的区别」对比小节。

---

**维护**：青联社技术组
