import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, type Request, type Response } from '../';
import { makeHttpRequest } from './helpers';

describe('Authentication Tests', () => {
  let testPort: number;

  beforeEach(() => {
    testPort = Math.floor(Math.random() * 10000) + 3000;
  });

  afterEach(async () => {
    // Cleanup handled by test completion
  });

  describe('User Registration', () => {
    it('should register new user successfully', async () => {
      const app = createApp();
      
      app.post('/api/auth/register', (req: Request, res: Response) => {
        const userData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        if (!userData.username || !userData.email || !userData.password) {
          return res.status(400).json({
            success: false,
            message: 'Username, email and password are required'
          });
        }

        // Simulate successful registration
        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user: {
            id: '123',
            username: userData.username,
            email: userData.email
          }
        });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Auth registration test server started on port ${testPort}`);
          
          try {
            const userData = {
              username: 'testuser',
              email: 'test@example.com',
              password: 'password123'
            };

            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/auth/register',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData)
            });
            
            expect(response.statusCode).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.user.username).toBe(userData.username);
            expect(response.body.user.email).toBe(userData.email);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should reject registration with missing fields', async () => {
      const app = createApp();
      
      app.post('/api/auth/register', (req: Request, res: Response) => {
        const userData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        if (!userData.username || !userData.email || !userData.password) {
          return res.status(400).json({
            success: false,
            message: 'Username, email and password are required'
          });
        }

        res.status(201).json({ success: true });
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Auth registration validation test server started on port ${testPort}`);
          
          try {
            const userData = {
              username: 'testuser'
              // Missing email and password
            };

            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/auth/register',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData)
            });
            
            expect(response.statusCode).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('required');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('User Login', () => {
    it('should login user successfully', async () => {
      const app = createApp();
      
      app.post('/api/auth/login', (req: Request, res: Response) => {
        const userData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        if (userData.email === 'test@example.com' && userData.password === 'password123') {
          res.status(200).json({
            success: true,
            message: 'Login successful',
            sessionId: 'session_123',
            user: {
              id: '123',
              username: 'testuser',
              email: userData.email
            }
          });
        } else {
          res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Auth login test server started on port ${testPort}`);
          
          try {
            const userData = {
              email: 'test@example.com',
              password: 'password123'
            };

            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/auth/login',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData)
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.sessionId).toBeDefined();
            expect(response.body.user.email).toBe(userData.email);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should reject login with invalid credentials', async () => {
      const app = createApp();
      
      app.post('/api/auth/login', (req: Request, res: Response) => {
        const userData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        if (userData.email === 'test@example.com' && userData.password === 'password123') {
          res.status(200).json({ success: true });
        } else {
          res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Auth login validation test server started on port ${testPort}`);
          
          try {
            const userData = {
              email: 'test@example.com',
              password: 'wrongpassword'
            };

            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/auth/login',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData)
            });
            
            expect(response.statusCode).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('Session Management', () => {
    it('should validate session from cookie', async () => {
      const app = createApp();
      
      app.get('/api/auth/profile', (req: Request, res: Response) => {
        const sessionId = req.getCookie('sessionId');
        
        if (sessionId === 'valid_session_123') {
          res.status(200).json({
            success: true,
            user: {
              id: '123',
              username: 'testuser',
              email: 'test@example.com'
            }
          });
        } else {
          res.status(401).json({
            success: false,
            message: 'Invalid session'
          });
        }
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Auth session validation test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/auth/profile',
              method: 'GET',
              headers: { 
                'Cookie': 'sessionId=valid_session_123'
              }
            });
            
            expect(response.statusCode).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.user.username).toBe('testuser');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it('should reject request without session cookie', async () => {
      const app = createApp();
      
      app.get('/api/auth/profile', (req: Request, res: Response) => {
        const sessionId = req.getCookie('sessionId');
        
        if (sessionId === 'valid_session_123') {
          res.status(200).json({ success: true });
        } else {
          res.status(401).json({
            success: false,
            message: 'Invalid session'
          });
        }
      });

      return new Promise<void>(async (resolve, reject) => {
        app.listen(testPort, async () => {
          console.log(`🧪 Auth session missing test server started on port ${testPort}`);
          
          try {
            const response = await makeHttpRequest({
              hostname: '127.0.0.1',
              port: testPort,
              path: '/api/auth/profile',
              method: 'GET'
              // No cookie header
            });
            
            expect(response.statusCode).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid session');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });
});
