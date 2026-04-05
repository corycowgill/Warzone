import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['js/**/*.js'],
      exclude: ['js/main.js', 'js/rendering/**'],
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      'three': resolve('./tests/mocks/three.js'),
    },
  },
});
