import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
export default defineConfig({
  base: './',
  define: { __PHASER_AVAILABLE__: JSON.stringify(existsSync('public/vendor/phaser.min.js')) },
  build: { target: 'es2022' },
  server: { host: '0.0.0.0' },
});
