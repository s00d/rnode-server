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
    // Запуск тестов по одному
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true,
      },
    },
    // Дополнительные настройки для изоляции
    isolate: true,
    sequence: {
      shuffle: false,
    },
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
