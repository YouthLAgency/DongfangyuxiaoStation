/** @type {import('tailwindcss').Config */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 主色：赤红
        primary: {
          DEFAULT: '#C8102E',
          dark: '#8a0b20',
          light: '#fecaca',
        },
        // 墨黑
        ink: {
          DEFAULT: '#1A1A1A',
          light: '#3a3a3a',
        },
        // 背景米白
        paper: {
          DEFAULT: '#F9F7F4',
          dark: '#f0ebe1',
        },
        // 金黄（★主要模块标识色）
        gold: {
          DEFAULT: '#E6B422',
          dark: '#b88a14',
          light: '#f3d27a',
        },
      },
      fontFamily: {
        // 正文：思源宋体
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"Songti SC"', '"SimSun"', 'serif'],
        // 标题：思源黑体 Bold
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        // 装饰标题
        display: ['"ZCOOL XiaoWei"', '"Noto Serif SC"', 'serif'],
      },
      maxWidth: {
        content: '1100px',
      },
    },
  },
  plugins: [],
};
