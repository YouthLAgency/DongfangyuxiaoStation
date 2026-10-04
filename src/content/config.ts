import { defineCollection, z } from 'astro:content';

// 理论文章集合
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
      category: z.enum(['入门', '理论', '历史', '时事', '工具']).default('理论'),
      draft: z.boolean().default(false),
    }),
});

// 文艺作品集合
const art = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      author: z.string(),
      date: z.date(),
      type: z.enum(['诗歌', '散文', '小说', '评论', '音乐', '美术']),
      cover: image().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
    }),
});

// 刊物集合
const journals = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      issue: z.string(),
      description: z.string(),
      date: z.date(),
      cover: image().optional(),
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
    category: z.enum(['哲学', '政治经济学', '科学社会主义', '党史', '人物']).default('哲学'),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { articles, art, journals, concepts };
