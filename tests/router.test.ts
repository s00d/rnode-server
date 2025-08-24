import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, type Request, type Response } from '../';
import { makeHttpRequest } from './helpers';

describe('Router Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let testPort: number;

  beforeEach(() => {
    app = createApp();
    testPort = Math.floor(Math.random() * 10000) + 3000;
  });

  afterEach(async () => {
    // Cleanup handled by test completion
  });

  describe('Server Startup', () => {
    it('should start server and respond to requests', async () => {
      // Register a test route
      app.get('/test', (req: Request, res: Response) => {
        res.json({ message: 'Test route working' });
      });

      // Start server
      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Test server started on port ${testPort}`);
          
          try {
            // Test the route
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/test',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.message).toBe('Test route working');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('Route Registration', () => {
    it('should register and handle multiple routes', async () => {
      app.get('/users', (req: Request, res: Response) => {
        res.json({ users: ['user1', 'user2'] });
      });
      
      app.post('/users', (req: Request, res: Response) => {
        res.json({ created: true });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Test server started on port ${testPort}`);
          
          try {
            // Test GET route
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/users',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body).toBeDefined();
            expect(response.body.users).toEqual(['user1', 'user2']);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
});
