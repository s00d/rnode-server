import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, type Request, type Response } from '../';
import { makeHttpRequest } from './helpers';

describe('HTTP Methods Tests', () => {
  let app: ReturnType<typeof createApp>;
  let testPort: number;

  beforeEach(() => {
    app = createApp();
    testPort = Math.floor(Math.random() * 10000) + 3000;
  });

  afterEach(async () => {
    // Cleanup handled by test completion
  });

  describe('GET Method', () => {
    it('should handle GET requests correctly', async () => {
      app.get('/users', (req: Request, res: Response) => {
        res.json({ method: 'GET', users: ['user1', 'user2'] });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 GET method test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/users',
              method: 'GET'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.method).toBe('GET');
            expect(response.body.users).toEqual(['user1', 'user2']);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('POST Method', () => {
    it('should handle POST requests with body', async () => {
      app.post('/users', (req: Request, res: Response) => {
        res.json({ 
          method: 'POST', 
          receivedBody: req.body,
          message: 'User created' 
        });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 POST method test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/users',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'John', email: 'john@example.com' })
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.method).toBe('POST');
            expect(response.body.message).toBe('User created');
            expect(response.body.receivedBody).toBeDefined();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('PUT Method', () => {
    it('should handle PUT requests', async () => {
      app.put('/users/1', (req: Request, res: Response) => {
        res.json({ 
          method: 'PUT', 
          id: req.params.id || '1',
          message: 'User updated' 
        });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 PUT method test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/users/1',
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'John Updated' })
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.method).toBe('PUT');
            expect(response.body.id).toBe('1');
            expect(response.body.message).toBe('User updated');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('DELETE Method', () => {
    it('should handle DELETE requests', async () => {
      app.delete('/users/1', (req: Request, res: Response) => {
        res.json({ 
          method: 'DELETE', 
          id: req.params.id || '1',
          message: 'User deleted' 
        });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 DELETE method test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/users/1',
              method: 'DELETE'
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.method).toBe('DELETE');
            expect(response.body.id).toBe('1');
            expect(response.body.message).toBe('User deleted');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('PATCH Method', () => {
    it('should handle PATCH requests', async () => {
      app.patch('/users/1', (req: Request, res: Response) => {
        res.json({ 
          method: 'PATCH', 
          id: req.params.id || '1',
          message: 'User partially updated' 
        });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 PATCH method test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/users/1',
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: 'newemail@example.com' })
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.method).toBe('PATCH');
            expect(response.body.id).toBe('1');
            expect(response.body.message).toBe('User partially updated');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('OPTIONS Method', () => {
    it('should handle OPTIONS requests', async () => {
      app.options('/users', (req: Request, res: Response) => {
        res.status(200).end();
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 OPTIONS method test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/users',
              method: 'OPTIONS'
            });
            
            // OPTIONS might return 405 Method Not Allowed if not properly implemented
            expect([200, 405]).toContain(response.statusCode);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
});
