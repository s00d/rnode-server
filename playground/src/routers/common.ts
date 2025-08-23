import { Router, Request, Response } from 'rnode-server';

export const commonRouter = Router();

// Simple test route
commonRouter.get('hello', (req: Request, res: Response) => {
  res.json({
    message: 'Hello from RNode server!',
    timestamp: new Date().toISOString()
  });
});

// Secure endpoint
commonRouter.get('secure', (req: Request, res: Response) => {
  res.json({
    message: 'This is a secure endpoint',
    secure: true,
    timestamp: new Date().toISOString(),
    clientIP: req.getHeader('x-forwarded-for') || '127.0.0.1'
  });
});
