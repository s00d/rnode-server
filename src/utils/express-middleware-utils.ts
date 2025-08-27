import { logger } from './logger';
import { Request } from './request';
import { Response } from './response';
import { ExpressMiddleware, ExpressErrorMiddleware } from '../types/request-response';
import { convertToExpressRequest, convertToExpressResponse, createExpressNextFunction } from './express-utils';

export function createExpressMiddlewareWrapper(
  expressMiddleware: ExpressMiddleware,
  req: Request,
  res: Response,
  next: (error?: any) => void
): void {
  try {
    // Convert RNode Request to Express Request
    const expressReq = convertToExpressRequest(req);

    // Convert RNode Response to Express Response
    const expressRes = convertToExpressResponse(res);

    // Create Express NextFunction that properly handles errors
    const expressNext = createExpressNextFunction(req, res, next);

    // Execute Express middleware with proper error handling
    logger.debug(`🔒 Executing Express middleware for origin: ${req.headers.origin}`);

    // Execute Express middleware
    expressMiddleware(expressReq, expressRes, expressNext);
  } catch (error) {
    logger.error('❌ Error in Express middleware:', error instanceof Error ? error.message : String(error));
    next(error);
  }
}

export function createExpressErrorMiddlewareWrapper(
  expressErrorMiddleware: ExpressErrorMiddleware,
  req: Request,
  res: Response,
  next: (error?: any) => void
): void {
  try {
    // Convert RNode Request to Express Request
    const expressReq = convertToExpressRequest(req);

    // Convert RNode Response to Express Response
    const expressRes = convertToExpressResponse(res);

    // Create Express NextFunction
    const expressNext = (error?: any) => {
      next(error); // Pass error to the next middleware/handler
    };

    // Execute Express error middleware
    expressErrorMiddleware(null, expressReq, expressRes, expressNext);
  } catch (error) {
    // If error middleware fails, continue
    next(error);
  }
}
