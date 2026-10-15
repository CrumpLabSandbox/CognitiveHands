import { defineConfig } from 'vite';

// On GitHub Pages the site lives under /CognitiveHands/.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/CognitiveHands/' : '/',
  test: {
    environment: 'node',
  },
});
