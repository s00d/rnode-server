import { logger } from './logger';
import { createRequestObject, createResponseObject } from './request-response-factory';
import { Request } from './request';
import { Response } from './response';
import { getHandler } from './handler-utils';
import { executeMiddleware } from './middleware-utils';
import { setupGracefulShutdown } from './shutdown-utils';

// Global variables for handlers and middlewares (like in old version)
export const handlers = new Map<string, { method: string; handler: (req: Request, res: Response) => void | Promise<any> }>();
export const middlewares = new Map<string, ((req: Request, res: Response, next: (error?: any) => void) => void | Promise<any>)[]>();

export function setupGlobalFunctions(): void {
  // Export functions for Rust
  (global as any).getHandler = getHandler;
  (global as any).executeMiddleware = executeMiddleware;

  // Setup graceful shutdown
  setupGracefulShutdown();

  logger.info('✅ Global functions and variables initialized', 'rnode_server::global');
}
