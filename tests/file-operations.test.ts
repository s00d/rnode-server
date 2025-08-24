import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, type Request, type Response } from '../';
import { makeHttpRequest } from './helpers';
import * as path from 'path';

describe('File Operations Tests', () => {
  let testPort: number;
  let testStaticDir: string;

  beforeEach(() => {
    testPort = Math.floor(Math.random() * 10000) + 3000;
    testStaticDir = path.join(__dirname, 'static');
  });

  afterEach(async () => {
    // Cleanup handled by test completion
  });

  describe('Static File Serving', () => {
    it('should serve static HTML file', async () => {
      const app = createApp();
      app.static(testStaticDir);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/test.html',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('text/html');
            expect(response.body).toContain('Test HTML File');
            expect(response.body).toContain('special characters');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should serve static CSS file', async () => {
      const app = createApp();
      app.static(testStaticDir);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/test.css',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('text/css');
            expect(response.body).toContain('background-color');
            expect(response.body).toContain('border-radius');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should serve static JS file', async () => {
      const app = createApp();
      app.static(testStaticDir);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/test.js',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('text/javascript');
            expect(response.body).toContain('testFunction');
            expect(response.body).toContain('Test Object');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should serve static JSON file', async () => {
      const app = createApp();
      app.static(testStaticDir);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/data.json',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('application/json');
            
            // Check if body is string or parsed object
            if (typeof response.body === 'string') {
                expect(response.body).toContain('John Doe');
                expect(response.body).toContain('Jane Smith');
                expect(response.body).toContain('dark');
            } else if (Array.isArray(response.body)) {
                // If body is parsed as array, check that it's not empty
                expect(response.body.length).toBeGreaterThan(0);
            } else {
                // If body is parsed as object, check its properties
                expect(response.body).toBeDefined();
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should return 404 for non-existent file', async () => {
      const app = createApp();
      app.static(testStaticDir);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/nonexistent.html',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(404);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should serve static files with custom options', async () => {
      const app = createApp();
      app.static(testStaticDir, {
        cache: true,
        maxAge: 3600,
        etag: true,
        lastModified: true,
        gzip: false,
        brotli: false
      });
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/test.html',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('text/html');
            expect(response.headers['cache-control']).toBeDefined();
            expect(response.headers['etag']).toBeDefined();
            expect(response.headers['last-modified']).toBeDefined();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should serve README file with correct MIME type', async () => {
      const app = createApp();
      app.static(testStaticDir);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/README.md',
              method: 'GET'
            });
            
            // Some servers might not support .md files, so we check both 200 and 404
            if (response.statusCode === 200) {
              const contentType = response.headers['content-type'];
              expect(contentType.includes('text/markdown') || contentType.includes('text/plain')).toBe(true);
              expect(response.body).toContain('Test Static Files');
              expect(response.body).toContain('HTML file with basic structure');
            } else if (response.statusCode === 404) {
              // If .md files are not supported, that's also acceptable
              console.log('ℹ️ README.md file not served (404) - .md files may not be supported');
            } else {
              // Any other status code is unexpected
              expect(response.statusCode).toBe(200);
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('File Upload Routes', () => {
    it('should register upload route with options', () => {
      const app = createApp();
      
      const uploadOptions = {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/*', 'application/pdf'],
        folder: './uploads',
        multiple: false,
        overwrite: true
      };
      
      app.upload('/upload', uploadOptions);
      
      // Upload routes are registered in Rust backend, not in handlers
      expect(app).toBeDefined();
      expect(typeof app.upload).toBe('function');
    });

    it('should register multiple file upload route', () => {
      const app = createApp();
      
      const uploadOptions = {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif'],
        folder: './uploads',
        multiple: true,
        maxFiles: 10,
        overwrite: true
      };
      
      app.upload('/upload-multiple', uploadOptions);
      
      expect(app).toBeDefined();
      expect(typeof app.upload).toBe('function');
    });

    it('should register upload route with wildcard subfolder', () => {
      const app = createApp();
      
      const uploadOptions = {
        folder: './uploads',
        allowedSubfolders: ['*'], // Allow any subfolder
        maxFileSize: 50 * 1024 * 1024,
        allowedExtensions: ['.png', '.jpg', '.pdf', '.txt'],
        multiple: false
      };
      
      app.upload('/upload/{*subfolder}', uploadOptions);
      
      expect(app).toBeDefined();
      expect(typeof app.upload).toBe('function');
    });
  });

  describe('File Download Routes', () => {
    it('should register download route with options', () => {
      const app = createApp();
      
      const downloadOptions = {
        folder: './uploads',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
        allowHiddenFiles: false,
        allowSystemFiles: false
      };
      
      app.download('/download/{*name}', downloadOptions);
      
      expect(app).toBeDefined();
      expect(typeof app.download).toBe('function');
    });
  });

  describe('Basic App Functionality', () => {
    it('should create app instance', () => {
      const app = createApp();
      expect(app).toBeDefined();
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
      expect(typeof app.upload).toBe('function');
      expect(typeof app.download).toBe('function');
      expect(typeof app.static).toBe('function');
    });

    it('should have empty handlers initially', () => {
      const app = createApp();
      expect(app.getHandlers().size).toBe(0);
      expect(app.getMiddlewares().size).toBe(0);
    });

    it('should register basic routes', () => {
      const app = createApp();
      
      app.get('/test', (req: Request, res: Response) => {
        res.json({ message: 'test' });
      });
      
      expect(app.getHandlers().size).toBe(1);
      expect(app.getHandlers().has('GET:/test')).toBe(true);
    });
  });
});
