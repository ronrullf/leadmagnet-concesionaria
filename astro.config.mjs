// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: vercel({
    includeFiles: [
      './src/assets/fonts/BricolageGrotesque-Bold.ttf',
      './src/assets/fonts/InterTight-Regular.ttf',
    ],
  }),
  site: process.env.SITE_URL || 'https://demo.tiendapana.com',
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['@resvg/resvg-js'],
    },
  },
});
