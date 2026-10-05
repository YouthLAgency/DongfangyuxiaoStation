import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rss from '@astrojs/rss';

// 站点正式地址（部署后请同步更新）
const SITE_URL = 'https://dongfangyuxiao.example.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [tailwind(), mdx(), sitemap(), rss()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
