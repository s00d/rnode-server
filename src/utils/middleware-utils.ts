import { logger } from './logger';
import { createRequestObject, createResponseObject } from './request-response-factory';
import { middlewares } from './global-utils';
// Use micromatch for pattern matching (supports glob, regex, etc.)
import micromatch from "micromatch";



export async function executeMiddleware(middlewareJson: string, timeout: number): Promise<string> {
  console.log('🔍 executeMiddleware function called with middlewareJson length:', middlewareJson.length);
  
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
            // Set timeout to abort the operation using existing abortController
            const timeoutId = setTimeout(() => {
              req.abortController?.abort();
            }, timeout);
            
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
              // Middleware returned a promise - wait for it to resolve
              logger.debug('🔄 Middleware returned promise, waiting for resolution', 'rnode_server::middleware');
              
              try {
                const resolvedResult = await result;
                logger.debug('✅ Middleware promise resolved successfully', 'rnode_server::middleware');
                
                // Check if operation was aborted
                if (req.abortController?.signal.aborted) {
                  logger.warn('⚠️ Middleware was aborted due to timeout', 'rnode_server::middleware');
                  clearTimeout(timeoutId);
                  return JSON.stringify({
                    shouldContinue: false,
                    error: `Middleware timeout after ${timeout}ms`,
                    status: 408, // Request Timeout
                    errorType: 'timeout',
                    timeout: timeout,
                    req: {...req},
                    res: {...res}
                  });
                }
                
                // Clear timeout since operation completed successfully
                clearTimeout(timeoutId);
                
                // If middleware returned a result object, update req and res
                if (resolvedResult && typeof resolvedResult === 'object') {
                  if (resolvedResult.req) {
                    Object.assign(req, resolvedResult.req);
                  }
                  if (resolvedResult.res) {
                    Object.assign(res, resolvedResult.res);
                  }
                }
              } catch (error: any) {
                // Clear timeout on error
                clearTimeout(timeoutId);
                
                logger.error(`❌ Middleware promise rejected: ${error}`, 'rnode_server::middleware');
                return JSON.stringify({
                  shouldContinue: false,
                  error: error.message || 'Middleware timeout',
                  req: {...req},
                  res: {...res}
                });
              }
            } else {
              // Synchronous result - clear timeout
              clearTimeout(timeoutId);
              
              // Check if operation was aborted
              if (req.abortController?.signal.aborted) {
                logger.warn('⚠️ Middleware was aborted due to timeout', 'rnode_server::middleware');
                return JSON.stringify({
                  shouldContinue: false,
                  error: `Middleware timeout after ${timeout}ms`,
                  req: {...req},
                  res: {...res}
                });
              }
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
          } catch (error: any) {
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

    // All middleware executed successfully
    logger.debug('✅ All middleware executed successfully, continuing');
    
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

    const result = JSON.stringify({
      shouldContinue: true,
      req: finalReq,
      res: finalRes
    });
    
    logger.debug(`🔧 Returning middleware result: ${result.substring(0, 200)}...`, 'rnode_server::middleware');
    return result;
    
  } catch (error: any) {
    logger.error(`❌ executeMiddleware error: ${error instanceof Error ? error.message : String(error)}`, 'rnode_server::middleware');
    
    return JSON.stringify({
      shouldContinue: false,
      error: error instanceof Error ? error.message : String(error),
      req: {},
      res: { headers: {}, content: 'Middleware Error', contentType: 'text/plain' }
    });
  }
}
