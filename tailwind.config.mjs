/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#b91c1c',
          dark: '#7f1d1d',
          light: '#fecaca',
        },
        ink: '#1a1a1a',
        paper: {
          DEFAULT: '#faf7f2',
          dark: '#f0ebe1',
        },
      },
      fontFamily: {
        sans: ['"Noto Serif SC"', '"Source Han Serif SC"', '"Songti SC"', '"SimSun"', 'serif'],
        display: ['"ZCOOL XiaoWei"', '"Noto Serif SC"', 'serif'],
      },
    },
  },
  plugins: [],
};
