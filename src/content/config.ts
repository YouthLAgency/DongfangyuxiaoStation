import { defineCollection, z } from 'astro:content';

// 入门指南集合：阅读路径、推荐书单、社员招募
const guide = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      author: z.string().default('青联社'),
      date: z.date(),
      // 入门指南子类：阅读路径 / 概念入门 / 书单 / 招募
      type: z.enum(['阅读路径', '概念入门', '推荐书单', '社员招募', '通讯员征集']).default('阅读路径'),
      order: z.number().default(0),
      cover: image().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

// 理论文章集合：经典著作、概念词典、国际共运史、专题文章
const articles = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      author: z.string(),
      date: z.date(),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      category: z
        .enum(['经典著作', '概念词典', '国际共运史', '专题文章', '时事评论'])
        .default('专题文章'),
      // 来源标记：原创 / 译文 / 转载
      source: z.enum(['原创', '译文', '转载']).default('原创'),
      draft: z.boolean().default(false),
    }),
});

// 文艺作品集合：美术、文学、音乐、戏剧
const art = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      author: z.string(),
      date: z.date(),
      type: z.enum(['诗歌', '散文', '小说', '评论', '音乐', '美术', '戏剧']).default('诗歌'),
      cover: image().optional(),
      // 允许 bilibili 视频接入
      bilibili: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

// 期刊通讯集合：周刊/月刊/文艺报
const journals = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // 期号：如"创刊号""2026年第3期"
      issue: z.string(),
      description: z.string(),
      date: z.date(),
      // 期刊类型：周刊 / 月刊 / 文艺报 / 特刊
      type: z.enum(['周刊', '月刊', '文艺报', '特刊']).default('周刊'),
      cover: image().optional(),
      // 下载链接（外链）
      downloadUrl: z.string().optional(),
      // 是否开放在线阅读
      onlineReadable: z.boolean().default(true),
      // PDF 本地路径（同步脚本下载到 public/journals/，部署后从 Cloudflare CDN 提供）
      // 如 /journals/月刊/2026年七月第三期.pdf
      pdfLocal: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

// 概念词典集合
const concepts = defineCollection({
  type: 'content',
  schema: z.object({
    term: z.string(),
    description: z.string(),
    category: z
      .enum(['哲学', '政治经济学', '科学社会主义', '党史', '人物'])
      .default('哲学'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// 左翼工具箱集合
const tools = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string(),
    // 工具分类
    type: z.enum(['加密工具', '安全指南', '常用网站', '学习资源']).default('学习资源'),
    url: z.string().url().optional(),
    // 是否本站推荐
    recommended: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guide, articles, art, journals, concepts, tools };
