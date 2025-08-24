import { createServer, type IncomingMessage, type ServerResponse } from 'http';

export interface TestResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

export function makeHttpRequest(options: {
  hostname: string;
  port: number;
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const req = http.request(options, (res: IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers as Record<string, string>,
            body
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers as Record<string, string>,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

export function waitForServer(port: number, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Server startup timeout after ${timeout}ms`));
    }, timeout);

    const checkServer = () => {
      makeHttpRequest({
        hostname: '127.0.0.1',
        port,
        path: '/health',
        method: 'GET'
      }).then(() => {
        clearTimeout(timer);
        resolve();
      }).catch(() => {
        // Server not ready yet, retry
        setTimeout(checkServer, 100);
      });
    };

    checkServer();
  });
}
