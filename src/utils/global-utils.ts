import { logger } from './logger';
import { Request } from './request';
import { Response } from './response';
import { getHandler } from './handler-utils';
import { executeMiddleware } from './middleware-utils';
import { setupGracefulShutdown } from './shutdown-utils';

// Global variables for handlers and middlewares (like in old version)
export const handlers = new Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }>();
export const middlewares = new Map<string, ((req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>)[]>();

export function setupGlobalFunctions(): void {
  // Export functions for Rust - they are synchronous but return promises
  (global as any).getHandler = (requestJson: string, timeout: number) => {
    logger.debug('🔍 Rust called getHandler with:', requestJson.substring(0, 100) + '...');
    return getHandler(requestJson, timeout);
  };
  (global as any).executeMiddleware = (middlewareJson: string, timeout: number) => {
    logger.debug('🔍 Rust called executeMiddleware with:', middlewareJson.substring(0, 100) + '...');
    return executeMiddleware(middlewareJson, timeout)
  };

  // Setup graceful shutdown
  setupGracefulShutdown();

  logger.debug('✅ Global functions and variables initialized', 'rnode_server::global');
}
