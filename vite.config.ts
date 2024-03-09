import { defineConfig } from 'vite';

export default defineConfig({
  base: '/doka-worms/',
  resolve: {
    alias: {
      '~': './src',
    },
  },
});
