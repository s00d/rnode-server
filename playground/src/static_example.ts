import { createApp } from 'rnode-server';

const app = createApp();

// Example 1: Basic static files configuration
app.static('./public');

app.static('./assets', {
  cache: true,
  maxAge: 3600, // 1 hour
  maxFileSize: 5 * 1024 * 1024, // 5MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: false
});

// Load multiple folders with different settings
app.static(['./images', './icons'], {
  cache: true,
  maxAge: 86400, // 24 hours for images
  maxFileSize: 10 * 1024 * 1024, // 10MB
  etag: true,
  lastModified: true,
  gzip: false, // Images are already compressed
  brotli: false
});
app.static(['./css', './styles'], {
  cache: true,
  maxAge: 1800, // 30 minutes for CSS
  maxFileSize: 1024 * 1024, // 1MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: true
});

// Example 4: Different settings for different content types
app.static('./js', {
  cache: true,
  maxAge: 900, // 15 minutes for JavaScript
  gzip: true,
  brotli: true
});

app.static('./fonts', {
  cache: true,
  maxAge: 604800, // 1 week for fonts
  gzip: false,
  brotli: false
});

// Start server
app.listen(4541, () => {
  console.log('Server running on port 4541');
  console.log('Static files configured with advanced options');
});
