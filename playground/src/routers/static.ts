import { Router, Request, Response } from 'rnode-server';
export const staticRouter = Router();

staticRouter.static('./assets', {
  cache: true,
  maxAge: 3600, // 1 hour
  maxFileSize: 5 * 1024 * 1024, // 5MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: false
});

// Load multiple folders with different settings
staticRouter.static(['./images', './icons'], {
  cache: true,
  maxAge: 86400, // 24 hours for images
  maxFileSize: 10 * 1024 * 1024, // 10MB
  etag: true,
  lastModified: true,
  gzip: false, // Images are already compressed
  brotli: false
});
staticRouter.static(['./css', './styles'], {
  cache: true,
  maxAge: 1800, // 30 minutes for CSS
  maxFileSize: 1024 * 1024, // 1MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: true
});

// Example 4: Different settings for different content types
staticRouter.static('./js', {
  cache: true,
  maxAge: 900, // 15 minutes for JavaScript
  gzip: true,
  brotli: true
});

staticRouter.static('./fonts', {
  cache: true,
  maxAge: 604800, // 1 week for fonts
  gzip: false,
  brotli: false
});
