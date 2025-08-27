import { logger } from './logger';
import { Request } from './request';
import { Response } from './response';
import { registerMiddleware, registerGlobalMiddleware } from './http-methods-utils';

export interface MiddlewareUtils {
  use(pathOrMiddleware: string | ((req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>), middleware?: (req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>): void;
}

export function createMiddlewareUtils(middlewares: Map<string, ((req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>)[]>): MiddlewareUtils {
  return {
    use(pathOrMiddleware: string | ((req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>), middleware?: (req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>) {
      if (typeof pathOrMiddleware === 'function') {
        // Global middleware: router.use(middleware)
        const existing = middlewares.get('*') || [];
        middlewares.set('*', [...existing, pathOrMiddleware]);
        // Don't register in global system here - it will be done in useRouter
      } else if (typeof pathOrMiddleware === 'string' && middleware) {
        // Middleware with path: router.use(path, middleware)
        const existing = middlewares.get(pathOrMiddleware) || [];
        middlewares.set(pathOrMiddleware, [...existing, middleware]);
        // Don't register in global system here - it will be done in useRouter
      } else {
        throw new Error('Invalid middleware registration: use(path, middleware) or use(middleware)');
      }
    }
  };
}
