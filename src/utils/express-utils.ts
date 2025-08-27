import { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Request } from './request';
import { Response } from './response';
import { logger } from './logger';

export function convertToExpressRequest(req: Request): ExpressRequest {
  return {
    ...req,
    // Add Express-specific properties
    app: {} as any,
    baseUrl: '',
    originalUrl: req.url,
    path: req.url,
    secure: false,
    subdomains: [],
    xhr: false,
    accepts: (type: string) => req.accepts(type),
    acceptsCharsets: (charset: string) => req.acceptsCharsets(charset),
    acceptsEncodings: (encoding: string) => req.acceptsEncodings(encoding),
    acceptsLanguages: (language: string) => req.acceptsLanguages(language),
    get: (name: string) => req.getHeader(name),
    header: (name: string) => req.getHeader(name),
    is: () => false,
    param: (name: string) => req.params[name] || req.query[name] || '',
    range: () => undefined,
    protocol: 'http',
    route: {} as any,
    signedCookies: {},
    stale: false,
    fresh: false,
    hostname: 'localhost',
    host: 'localhost:3000'
  } as unknown as ExpressRequest;
}

export function convertToExpressResponse(res: Response): ExpressResponse {
  let headersSent = false;
  let statusCode = 200;

  // Create a proxy that tracks changes to the response
  const expressRes = {
    ...res,
    // Add Express-specific properties
    app: {} as any,
    locals: {},
    charset: 'utf-8',
    // Only essential Express methods that make sense
    get: (field: string) => res.getHeader(field),
    set: (field: string, value: string) => {
      logger.debug(`🔧 Setting header: ${field} = ${value}`);
      res.setHeader(field, value);
      return expressRes;
    },
    header: (field: string, value: string) => {
      logger.debug(`🔧 Setting header: ${field} = ${value}`);
      res.setHeader(field, value);
      return expressRes;
    },
    json: (body: any) => {
      logger.debug('🔧 Sending JSON response');
      headersSent = true;
      res.json(body);
      return expressRes;
    },
    send: (body: any) => {
      logger.debug('🔧 Sending response');
      headersSent = true;
      res.send(body);
      return expressRes;
    },
    end: (chunk?: any) => {
      logger.debug('🔧 Ending response');
      headersSent = true;
      res.end(chunk);
      return expressRes;
    },
    status: (code: number) => {
      logger.debug(`🔧 Setting status: ${code}`);
      statusCode = code;
      res.status(code);
      return expressRes;
    },
    // Getters for tracking state
    get headersSent() {
      return headersSent;
    },
    get statusCode() {
      return statusCode;
    },
    // Override getHeaders to return the actual headers from res
    getHeaders: () => res.getHeaders()
  } as unknown as ExpressResponse;

  return expressRes;
}

export function createExpressNextFunction(
  req: Request, 
  res: Response, 
  next: (error?: any) => void
): NextFunction {
  return (error?: any) => {
    if (error) {
      // If middleware calls next(error), reject the promise
      logger.error(`❌ Middleware error: ${error.message || error}`);
      logger.debug(`❌ Origin: ${req.headers.origin}`);
      logger.debug(`❌ CORS blocked request - calling next(error)`);

      // Call next with error to trigger error handling
      next(error);
      return;
    }

    // Check if response was already sent by middleware
    logger.debug(`🔧 Checking response state: headersSent=${(res as any).headersSent}, statusCode=${(res as any).statusCode}`, 'rnode_server::express');
    if ((res as any).headersSent || (res as any).statusCode !== 200) {
      logger.debug('✅ Middleware handled response', 'rnode_server::express');
      logger.debug(`🔧 Response headers: ${JSON.stringify(res.getHeaders())}`, 'rnode_server::express');
      logger.debug(`🔧 Response status: ${(res as any).statusCode}`, 'rnode_server::express');
      return;
    }

    // Continue to next middleware/handler
    logger.debug('✅ Middleware passed, continuing', 'rnode_server::express');
    logger.debug(`🔧 Response headers after middleware: ${JSON.stringify(res.getHeaders())}`, 'rnode_server::express');
    next();
  };
}
