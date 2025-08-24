import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, type Request, type Response } from '../';
import { makeHttpRequest } from './helpers';

describe('Middleware Tests', () => {
  let testPort: number;

  beforeEach(() => {
    testPort = Math.floor(Math.random() * 10000) + 3000;
  });

  afterEach(async () => {
    // Cleanup handled by test completion
  });

  describe('Instance Isolation', () => {
    it('should have separate handlers and middlewares for each app instance', () => {
      const app1 = createApp();
      const app2 = createApp();

      // Add routes to first app
      app1.get('/test1', (req: Request, res: Response) => {
        res.json({ message: 'App 1 route' });
      });

      // Add routes to second app
      app2.get('/test2', (req: Request, res: Response) => {
        res.json({ message: 'App 2 route' });
      });

      // Check that each app has its own handlers
      expect(app1.getHandlers().size).toBe(1);
      expect(app2.getHandlers().size).toBe(1);
      expect(app1.getHandlers().has('GET:/test1')).toBe(true);
      expect(app2.getHandlers().has('GET:/test2')).toBe(true);
      expect(app1.getHandlers().has('GET:/test2')).toBe(false);
      expect(app2.getHandlers().has('GET:/test1')).toBe(false);
    });

    it('should have separate middlewares for each app instance', () => {
      const app1 = createApp();
      const app2 = createApp();

      // Add middleware to first app
      app1.use('*', (req: Request, res: Response, next: () => void) => {
        res.setHeader('X-App', '1');
        next();
      });

      // Add middleware to second app
      app2.use('*', (req: Request, res: Response, next: () => void) => {
        res.setHeader('X-App', '2');
        next();
      });

      // Check that each app has its own middlewares
      expect(app1.getMiddlewares().size).toBe(1);
      expect(app2.getMiddlewares().size).toBe(1);
      expect(app1.getMiddlewares().has('*')).toBe(true);
      expect(app2.getMiddlewares().has('*')).toBe(true);
    });
  });

  describe('Middleware Registration', () => {
    it('should register global middleware correctly', () => {
      const app = createApp();
      
      app.use((req: Request, res: Response, next: () => void) => {
        res.setHeader('X-Global', 'true');
        next();
      });

      expect(app.getMiddlewares().size).toBe(1);
      expect(app.getMiddlewares().has('*')).toBe(true);
      expect(app.getMiddlewares().get('*')?.length).toBe(1);
    });

    it('should register path-specific middleware correctly', () => {
      const app = createApp();
      
      app.use('/api/*', (req: Request, res: Response, next: () => void) => {
        res.setHeader('X-API', 'true');
        next();
      });

      expect(app.getMiddlewares().size).toBe(1);
      expect(app.getMiddlewares().has('/api/*')).toBe(true);
      expect(app.getMiddlewares().get('/api/*')?.length).toBe(1);
    });

    it('should register multiple middleware for the same path', () => {
      const app = createApp();
      
      app.use('*', (req: Request, res: Response, next: () => void) => {
        res.setHeader('X-Middleware1', 'true');
        next();
      });

      app.use('*', (req: Request, res: Response, next: () => void) => {
        res.setHeader('X-Middleware2', 'true');
        next();
      });

      expect(app.getMiddlewares().size).toBe(1);
      expect(app.getMiddlewares().has('*')).toBe(true);
      expect(app.getMiddlewares().get('*')?.length).toBe(2);
    });
  });

  describe('Route Registration', () => {
    it('should register routes correctly', () => {
      const app = createApp();
      
      app.get('/users', (req: Request, res: Response) => {
        res.json({ message: 'Users route' });
      });

      app.post('/users', (req: Request, res: Response) => {
        res.json({ message: 'Create user' });
      });

      expect(app.getHandlers().size).toBe(2);
      expect(app.getHandlers().has('GET:/users')).toBe(true);
      expect(app.getHandlers().has('POST:/users')).toBe(true);
    });

    it('should support method chaining', () => {
      const app = createApp();
      
      app.get('/test', (req: Request, res: Response) => {
        res.json({ message: 'Test' });
      })
      app.post('/test', (req: Request, res: Response) => {
        res.json({ message: 'Test POST' });
      });

      expect(app.getHandlers().size).toBe(2);
      expect(app.getHandlers().has('GET:/test')).toBe(true);
      expect(app.getHandlers().has('POST:/test')).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle routes without middleware', async () => {
      const app = createApp();
      
      app.get('/test', (req: Request, res: Response) => {
        res.json({ message: 'Route executed' });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Basic route test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/test',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Route executed');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should set custom headers in route handler', async () => {
      const app = createApp();
      
      app.get('/test-headers', (req: Request, res: Response) => {
        res.setHeader('X-Custom-Header', 'test-value');
        res.setHeader('X-Another-Header', 'another-value');
        res.json({ message: 'Headers set in route' });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Route headers test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/test-headers',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.headers['x-custom-header']).toBe('test-value');
            expect(response.headers['x-another-header']).toBe('another-value');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
});
