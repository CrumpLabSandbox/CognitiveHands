import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// On GitHub Pages the site lives under /CognitiveHands/.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/CognitiveHands/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
