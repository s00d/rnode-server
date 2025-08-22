import { createApp } from 'rnode-server';

const app = createApp();

// Пример 1: Базовая настройка статических файлов
app.static('./public');

app.static('./assets', {
  cache: true,
  maxAge: 3600, // 1 час
  maxFileSize: 5 * 1024 * 1024, // 5MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: false
});

// Загружаем несколько папок с разными настройками
app.static(['./images', './icons'], {
  cache: true,
  maxAge: 86400, // 24 часа для изображений
  maxFileSize: 10 * 1024 * 1024, // 10MB
  etag: true,
  lastModified: true,
  gzip: false, // Изображения уже сжаты
  brotli: false
});
app.static(['./css', './styles'], {
  cache: true,
  maxAge: 1800, // 30 минут для CSS
  maxFileSize: 1024 * 1024, // 1MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: true
});

// Пример 4: Разные настройки для разных типов контента
app.static('./js', {
  cache: true,
  maxAge: 900, // 15 минут для JavaScript
  gzip: true,
  brotli: true
});

app.static('./fonts', {
  cache: true,
  maxAge: 604800, // 1 неделя для шрифтов
  gzip: false,
  brotli: false
});

// Запускаем сервер
app.listen(4541, () => {
  console.log('Server running on port 4541');
  console.log('Static files configured with advanced options');
});
