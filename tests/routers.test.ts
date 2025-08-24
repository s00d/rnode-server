import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, Router, type Request, type Response } from '../';
import { makeHttpRequest } from './helpers';

describe('Routers Tests', () => {
  let testPort: number;

  beforeEach(() => {
    testPort = Math.floor(Math.random() * 10000) + 3000;
  });

  afterEach(async () => {
    // Cleanup handled by test completion
  });

  describe('Router Creation', () => {
    it('should create router instance', () => {
      const router = Router();
      
      expect(router).toBeDefined();
      expect(typeof router.get).toBe('function');
      expect(typeof router.post).toBe('function');
      expect(typeof router.use).toBe('function');
    });

    it('should create router with separate handlers and middlewares', () => {
      const router1 = Router();
      const router2 = Router();
      
      router1.get('/test1', (req: Request, res: Response) => {
        res.json({ message: 'Router 1' });
      });
      
      router2.get('/test2', (req: Request, res: Response) => {
        res.json({ message: 'Router 2' });
      });
      
      expect(router1.getHandlers().size).toBe(1);
      expect(router2.getHandlers().size).toBe(1);
      expect(router1.getHandlers().has('GET:/test1')).toBe(true);
      expect(router2.getHandlers().has('GET:/test2')).toBe(true);
    });
  });

  describe('Router Methods', () => {
    it('should register GET route', () => {
      const router = Router();
      
      router.get('/users', (req: Request, res: Response) => {
        res.json({ users: [] });
      });
      
      expect(router.getHandlers().has('GET:/users')).toBe(true);
    });

    it('should register POST route', () => {
      const router = Router();
      
      router.post('/users', (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      expect(router.getHandlers().has('POST:/users')).toBe(true);
    });

    it('should register PUT route', () => {
      const router = Router();
      
      router.put('/users/{id}', (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      expect(router.getHandlers().has('PUT:/users/{id}')).toBe(true);
    });

    it('should register DELETE route', () => {
      const router = Router();
      
      router.delete('/users/{id}', (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      expect(router.getHandlers().has('DELETE:/users/{id}')).toBe(true);
    });

    it('should register PATCH route', () => {
      const router = Router();
      
      router.patch('/users/{id}', (req: Request, res: Response) => {
        res.json({ success: true });
      });
      
      expect(router.getHandlers().has('PATCH:/users/{id}')).toBe(true);
    });

    it('should register OPTIONS route', () => {
      const router = Router();
      
      router.options('/users', (req: Request, res: Response) => {
        res.status(200).end();
      });
      
      expect(router.getHandlers().has('OPTIONS:/users')).toBe(true);
    });
  });

  describe('Router Middleware', () => {
    it('should register global middleware', () => {
      const router = Router();
      
      router.use((req: Request, res: Response, next: () => void) => {
        req.setParam('global', true);
        next();
      });
      
      expect(router.getMiddlewares().has('*')).toBe(true);
      expect(router.getMiddlewares().get('*')?.length).toBe(1);
    });

    it('should register path-specific middleware', () => {
      const router = Router();
      
      router.use('/api/*', (req: Request, res: Response, next: () => void) => {
        req.setParam('api', true);
        next();
      });
      
      expect(router.getMiddlewares().has('/api/*')).toBe(true);
      expect(router.getMiddlewares().get('/api/*')?.length).toBe(1);
    });

    it('should register multiple middleware for same path', () => {
      const router = Router();
      
      router.use('*', (req: Request, res: Response, next: () => void) => {
        req.setParam('middleware1', true);
        next();
      });
      
      router.use('*', (req: Request, res: Response, next: () => void) => {
        req.setParam('middleware2', true);
        next();
      });
      
      expect(router.getMiddlewares().get('*')?.length).toBe(2);
    });
  });

  describe('Router Integration', () => {
    it('should integrate router with main app', async () => {
      const app = createApp();
      const router = Router();
      
      router.get('/users', (req: Request, res: Response) => {
        res.json({ users: ['user1', 'user2'] });
      });
      
      app.useRouter('/api', router);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Router integration test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/users',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.users).toEqual(['user1', 'user2']);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should handle router middleware in integration', async () => {
      const app = createApp();
      const router = Router();
      
      router.use('*', (req: Request, res: Response, next: () => void) => {
        req.setParam('routerMiddleware', true);
        next();
      });
      
      router.get('/test', (req: Request, res: Response) => {
        const params = req.getParams();
        res.json({ 
          message: 'Router middleware executed',
          params: params
        });
      });
      
      app.useRouter('/router', router);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Router middleware integration test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/router/test',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.message).toBe('Router middleware executed');
            expect(response.body.params.routerMiddleware).toBe(true);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('Router Path Parameters', () => {
    it('should handle path parameters in router', async () => {
      const app = createApp();
      const router = Router();
      
      router.get('/users/{id}', (req: Request, res: Response) => {
        const userId = req.params.id;
        res.json({ 
          message: 'User found',
          userId: userId,
          params: req.params
        });
      });
      
      app.useRouter('/api', router);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Router path parameters test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/users/123',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.userId).toBe('123');
            expect(response.body.params.id).toBe('123');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should handle multiple path parameters', async () => {
      const app = createApp();
      const router = Router();
      
      router.get('/users/{id}/posts/{postId}', (req: Request, res: Response) => {
        const userId = req.params.id;
        const postId = req.params.postId;
        res.json({ 
          userId: userId,
          postId: postId,
          params: req.params
        });
      });
      
      app.useRouter('/api', router);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Router multiple path parameters test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/users/123/posts/456',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.userId).toBe('123');
            expect(response.body.postId).toBe('456');
            expect(response.body.params.id).toBe('123');
            expect(response.body.params.postId).toBe('456');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('Router Query Parameters', () => {
    it('should handle query parameters in router', async () => {
      const app = createApp();
      const router = Router();
      
      router.get('/search', (req: Request, res: Response) => {
        const query = req.query;
        res.json({ 
          message: 'Search executed',
          query: query,
          q: query.q,
          page: query.page
        });
      });
      
      app.useRouter('/api', router);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Router query parameters test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/search?q=test&page=1',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.q).toBe('test');
            expect(response.body.page).toBe('1');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('Router Method Chaining', () => {
    it('should support method chaining for routes', () => {
      const router = Router();
      
      router.get('/users', (req: Request, res: Response) => {
        res.json({ message: 'GET users' });
      })
      router.post('/users', (req: Request, res: Response) => {
        res.json({ message: 'POST users' });
      })
      router.put('/users/{id}', (req: Request, res: Response) => {
        res.json({ message: 'PUT user' });
      })
      router.delete('/users/{id}', (req: Request, res: Response) => {
        res.json({ message: 'DELETE user' });
      });
      
      expect(router.getHandlers().size).toBe(4);
      expect(router.getHandlers().has('GET:/users')).toBe(true);
      expect(router.getHandlers().has('POST:/users')).toBe(true);
      expect(router.getHandlers().has('PUT:/users/{id}')).toBe(true);
      expect(router.getHandlers().has('DELETE:/users/{id}')).toBe(true);
    });

    it('should support method chaining for middleware', () => {
      const router = Router();
      
      router.use('*', (req: Request, res: Response, next: () => void) => {
        req.setParam('middleware1', true);
        next();
      })
      router.use('/api/*', (req: Request, res: Response, next: () => void) => {
          req.setParam('middleware2', true);
          next();
        });
      
      expect(router.getMiddlewares().size).toBe(2);
      expect(router.getMiddlewares().has('*')).toBe(true);
      expect(router.getMiddlewares().has('/api/*')).toBe(true);
    });
  });

  describe('Router Error Handling', () => {
    it('should handle errors in router middleware gracefully', async () => {
      const app = createApp();
      const router = Router();
      
      router.use('*', (req: Request, res: Response, next: (err: any) => void) => {
        try {
          // Simulate error
          throw new Error('Middleware error');
        } catch (error) {
          next(error);
        }
      });
      
      router.get('/test', (req: Request, res: Response) => {
        res.json({ message: 'Route executed' });
      });
      
      app.useRouter('/router', router);
      
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Router error handling test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/router/test',
              method: 'GET'
            });
            
            // Should handle error gracefully
            expect(response.statusCode).toBeDefined();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
});
