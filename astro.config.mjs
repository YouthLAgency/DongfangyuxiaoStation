import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 站点正式地址（部署后请同步更新）
const SITE_URL = 'https://dongfangyuxiao.example.com';

// 注意：@astrojs/rss 不是 Astro 集成，是用于 src/pages/rss.xml.js 端点的辅助函数。
// 它在 package.json 中作为依赖安装，但不在 integrations 数组中调用。
// https://docs.astro.build/en/recipes/rss/

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [tailwind(), mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
