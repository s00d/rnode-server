import { logger } from './logger';
import { createRequestObject, createResponseObject } from './request-response-factory';
import { getNextMiddlewarePromiseId, setupPromiseTimeout } from './promise-utils';
import * as addon from '../load.cjs';
import { middlewares } from './global-utils';

export function executeMiddleware(middlewareJson: string, timeout: number): string {
  try {
    const request = JSON.parse(middlewareJson);
    logger.debug(`🔍 executeMiddleware called with path: ${request.path}`, 'rnode_server::middleware');

    // Create req and res objects at function level
    const req = createRequestObject(request);
    const res = createResponseObject(request.cookies);

    // Search for suitable middleware
    // Note: This function will be called from Rust, so we need to access global middlewares
    if (!middlewares) {
      logger.error('❌ Global middlewares not initialized.', 'rnode_server::middleware');
      return JSON.stringify({
        shouldContinue: false,
        error: 'Internal Server Error: Middlewares not initialized',
        req: {...request},
        res: { headers: {}, content: '', contentType: 'text/plain' }
      });
    }

    logger.debug(`🔍 Available middleware patterns: ${Array.from(middlewares.keys()).join(', ')}`, 'rnode_server::middleware');

    for (const [middlewarePath, middlewareArray] of middlewares) {
      logger.debug(`🔍 Checking middleware pattern: ${middlewarePath} against path: ${request.path}`);

      let matches = false;

      if (middlewarePath === '*') {
        // Global middleware matches everything
        matches = true;
        logger.debug('✅ Global middleware (*) matches');
      } else {
        // Use micromatch for pattern matching (supports glob, regex, etc.)
        const micromatch = require('micromatch');
        matches = micromatch.isMatch(request.path, middlewarePath);
        logger.debug(`🔍 Micromatch check: ${request.path} matches ${middlewarePath} -> ${matches}`);
      }

      // Execute middleware for this pattern
      if (matches) {
        logger.debug(`✅ Executing ${middlewareArray.length} middleware for pattern: ${middlewarePath}`);

        // Execute all middleware for this path
        logger.debug(`🔧 Starting with params: ${JSON.stringify(req.customParams)}`, 'rnode_server::middleware');

        for (let i = 0; i < middlewareArray.length; i++) {
          const middleware = middlewareArray[i];
          logger.debug(`🔄 Executing middleware ${i + 1} of ${middlewareArray.length}`);

          try {
            // Call middleware function with req and res objects
            let middlewareError: any = null;

            logger.debug(`🔍 Executing middleware for pattern: ${middlewarePath}`);
            logger.debug(`🔍 Request origin: ${req.headers.origin}`);

            const result = middleware(req, res, (error?: any) => {
              // Next function - continue to next middleware
              if (error) {
                // If middleware throws an error, stop execution and return error
                logger.error('❌ Middleware error:', error);
                middlewareError = error;
              } else {
                logger.debug('✅ Middleware completed without error');
              }
            });

            // Check if middleware returned a promise
            if (result !== undefined && result !== null && typeof result === 'object' && typeof (result as any).then === 'function') {
              // Middleware returned a promise - we need to wait for it
              const promiseId = getNextMiddlewarePromiseId();
              const promise = result as Promise<any>;
              
              logger.debug(`🔄 Middleware returned promise ${promiseId}, waiting for completion`, 'rnode_server::middleware');
              
              // Set up timeout to abort the request if it takes too long
              setupPromiseTimeout(
                promise,
                promiseId,
                timeout,
                req.abortController!,
                (value: any) => {
                  // Вызываем Rust функцию для установки результата
                  const result = {
                    shouldContinue: true,
                    req: {...req},
                    res: {...res}
                  };
                  
                  try {
                    addon.setPromiseResult(promiseId, JSON.stringify(result));
                    logger.debug(`✅ Middleware promise ${promiseId} resolved with result`, 'rnode_server::middleware');
                  } catch (error) {
                    logger.error(`❌ Failed to set middleware promise result: ${error}`, 'rnode_server::middleware');
                  }
                },
                (error: any) => {
                  // Вызываем Rust функцию для установки ошибки
                  try {
                    addon.setPromiseError(promiseId, error.message || String(error));
                    logger.error(`❌ Middleware promise ${promiseId} rejected: ${error}`, 'rnode_server::middleware');
                  } catch (error) {
                    logger.error(`❌ Failed to set middleware promise error: ${error}`, 'rnode_server::middleware');
                  }
                }
              );
              
              // Return a response indicating the operation is in progress
              return JSON.stringify({
                shouldContinue: false,
                content: `Async middleware operation started. Promise ID: ${promiseId}`,
                contentType: 'text/plain',
                __async: true,
                __promiseId: promiseId,
                __status: 'started'
              });
            }

            // Check if middleware returned an error
            if (middlewareError) {
              logger.debug('❌ Middleware returned error, stopping execution');
              logger.debug(`❌ Error details: ${middlewareError.message || middlewareError}`);
              return JSON.stringify({
                shouldContinue: false,
                error: middlewareError.message || middlewareError.toString(),
                req: {...req},
                res: {...res}
              });
            }

            // Update accumulated params for next middleware
            logger.debug(`🔧 Updated params: ${JSON.stringify(req.customParams)}`, 'rnode_server::middleware');
          } catch (error) {
            logger.error(`❌ Middleware execution error: ${error instanceof Error ? error.message : String(error)}`, 'rnode_server::middleware');
            return JSON.stringify({
              shouldContinue: false,
              error: error instanceof Error ? error.message : String(error),
              req: {...req},
              res: {...res}
            });
          }
        }
      }
    }

    // This code will only execute if no middleware returned a Promise
    // For Promise-based middleware, the result is returned above
    logger.debug('✅ All middleware executed synchronously, continuing');
    // Always return accumulated parameters, even when continuing
    // Create req and res objects with accumulated data
    const finalReq = {
      ...request,
      customParams: req.customParams,
      headers: req.headers,
      cookies: req.cookies
    };

    const finalRes = {
      headers: res.getHeaders(),  // Используем реальные заголовки
      content: res.content || '',
      contentType: res.contentType || 'text/plain'
    };

    logger.debug(`🔧 Final response headers: ${JSON.stringify(finalRes.headers)}`, 'rnode_server::middleware');

    return JSON.stringify({
      shouldContinue: true,
      req: finalReq,
      res: finalRes
    });
  } catch (error) {
    logger.error(`❌ executeMiddleware error: ${error instanceof Error ? error.message : String(error)}`, 'rnode_server::middleware');

    // Create default req and res objects for error case
    const errorReq = {
      customParams: {},
      headers: {},
      cookies: '',
      path: '',
      method: '',
      body: '',
      queryParams: {},
      pathParams: {}
    };

    const errorRes = {
      headers: {},
      content: 'Middleware Error',
      contentType: 'text/plain'
    };

    return JSON.stringify({
      shouldContinue: false,
      req: errorReq,
      res: errorRes
    });
  }
}
