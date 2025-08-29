import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'RNodeWebSocketClient',
      fileName: (format) => `rnode-websocket-client.${format}.js`,
      formats: ['es', 'umd', 'iife']
    },
    rollupOptions: {
      output: {
        // Глобальные переменные для UMD и IIFE
        globals: {
          // Если есть внешние зависимости, указываем их здесь
        },
        // Для IIFE формата - экспортируем напрямую
        extend: true
      }
    },
    // Создаем source maps для отладки
    sourcemap: true,
    // Убираем минификацию
    minify: false,
    // Очищаем папку dist перед сборкой
    emptyOutDir: true
  },
  // Настройки для разработки
  server: {
    port: 3001,
    open: false
  },
  // Предварительная обработка
  esbuild: {
    target: 'es2020'
  }
});
