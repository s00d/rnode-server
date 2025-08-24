import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    include: ['./tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**', 
      '**/playground/**', 
      '**/on-astro-*/**',
      '**/lib/**',
      '**/crates/**',
      '**/platforms/**'
    ],
    root: '.',
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  esbuild: {
    target: 'node16',
  },
});
