import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articles = (await getCollection('articles', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: '东方欲晓——马列毛主义通讯站',
    description: '青联社官方网站，左翼青年入门指南、理论资源、文艺作品与刊物阅读的集散地。',
    site: context.site,
    items: articles.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      author: post.data.author,
      categories: [post.data.category, ...post.data.tags],
      link: `/theory/${post.slug}/`,
    })),
    customData: '<language>zh-CN</language><copyright>CC BY-NC-SA 4.0</copyright>',
  });
}
