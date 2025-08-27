import { logger } from './logger';
import { Request } from './request';
import { Response } from './response';
import * as addon from '../load.cjs';
import { handlers, middlewares } from './global-utils';

export function registerHttpMethod(
  method: string, 
  path: string, 
  handler: (req: Request, res: Response) => void | Promise<any>
): void {
  // Add to global handlers
  handlers.set(`${method}:${path}`, { method, handler });

  // Register in Rust addon
  const addonMethod = method.toLowerCase() === 'delete' ? 'del' : method.toLowerCase();
  (addon as any)[addonMethod](path, handler);

  logger.debug(`✅ Registered ${method} handler for path: ${path}`, 'rnode_server::http_methods');
}

export function registerMiddleware(
  path: string, 
  middleware: (req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>
): void {
  // Add to global middlewares
  const existing = middlewares.get(path) || [];
  middlewares.set(path, [...existing, middleware]);

  // Register in Rust addon
  addon.use(path, middleware);

  logger.debug(`✅ Registered middleware for path: ${path}`, 'rnode_server::http_methods');
}

export function registerGlobalMiddleware(
  middleware: (req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>
): void {
  // Add to global middlewares with '*' pattern
  const existing = middlewares.get('*') || [];
  middlewares.set('*', [...existing, middleware]);

  // Register in Rust addon with '*' pattern
  addon.use('*', middleware);

  logger.debug(`✅ Registered global middleware`, 'rnode_server::http_methods');
}
