import { logger } from './logger';
import { Request } from './request';
import { Response } from './response';
import { createRequestObject, createResponseObject } from './request-response-factory';
import { handlers } from './global-utils';

export async function getHandler(requestJson: string, timeout: number): Promise<string> {
  console.log('🔍 getHandler function called with requestJson length:', requestJson.length);
  
  try {
    const request = JSON.parse(requestJson);
    const { method, path, registeredPath, pathParams, queryParams, body, cookies, headers, ip, ips, ipSource } = request;

    logger.debug('🔍 getHandler called:', 'rnode_server::handler');
    logger.debug(`  Method: ${method}`, 'rnode_server::handler');
    logger.debug(`  Path: ${path}`, 'rnode_server::handler');
    logger.debug(`  RegisteredPath: ${registeredPath}`, 'rnode_server::handler');
    logger.debug(`  HandlerKey: ${method}:${registeredPath}`, 'rnode_server::handler');
    logger.debug(`  Timeout: ${timeout}ms`, 'rnode_server::handler');
    logger.debug(`  PathParams: ${JSON.stringify(pathParams)}`, 'rnode_server::handler');
    logger.debug(`  QueryParams: ${JSON.stringify(queryParams)}`, 'rnode_server::handler');
    logger.debug(`  Body: ${JSON.stringify(body)}`, 'rnode_server::handler');
    logger.debug(`  Headers: ${JSON.stringify(headers)}`, 'rnode_server::handler');
    logger.debug(`  IP: ${ip}`, 'rnode_server::handler');
    logger.debug(`  IPs: ${JSON.stringify(ips)}`, 'rnode_server::handler');
    logger.debug(`  IPSource: ${ipSource}`, 'rnode_server::handler');

    // Access global handlers from global scope
    if (!handlers) {
      logger.error('❌ Global handlers not initialized.', 'rnode_server::handler');
      return JSON.stringify({
        content: 'Internal Server Error: Handlers not initialized',
        contentType: 'text/plain'
      });
    }
    logger.debug(`  Available handlers: ${Array.from(handlers.keys()).join(', ')}`, 'rnode_server::handler');

    // Search for handler by registered path
    const handlerKey = `${method}:${registeredPath}`;
    const handler = handlers.get(handlerKey);

    if (handler) {
      logger.debug(`✅ Handler found for: ${handlerKey}`, 'rnode_server::handler');

      // Get parameters from previous calls
      const customParams = request.customParams || {};

      const req = createRequestObject(request);
      const res = createResponseObject(cookies);

      // Execute handler
      try {
        // Set timeout to abort the operation using existing abortController
        const timeoutId = setTimeout(() => {
          req.abortController?.abort();
        }, timeout);
        
        const result = handler.handler(req, res);
        
        // Check if handler returned a promise
        if (result !== undefined && result !== null && typeof result === 'object' && typeof result.then === 'function') {
          // Handler returned a promise - wait for it to resolve
          logger.debug('🔄 Handler returned promise, waiting for resolution', 'rnode_server::handler');

          try {
            const resolvedResult = await result;
            logger.debug('✅ Promise resolved successfully', 'rnode_server::handler');
            
            // Check if operation was aborted
            if (req.abortController?.signal.aborted) {
              logger.warn('⚠️ Handler was aborted due to timeout', 'rnode_server::handler');
              clearTimeout(timeoutId);
              return JSON.stringify({
                content: `Handler timeout after ${timeout}ms`,
                contentType: 'text/plain',
                status: 408, // Request Timeout
                error: 'timeout',
                timeout: timeout
              });
            }
            
            // Clear timeout since operation completed successfully
            clearTimeout(timeoutId);
            
            // Update response with resolved result if it's a Response object
            if (resolvedResult && typeof resolvedResult === 'object') {
              // For now, just log the resolved result
              logger.debug(`✅ Promise resolved with result: ${JSON.stringify(resolvedResult)}`, 'rnode_server::handler');
            }
            
            return JSON.stringify({
              content: res.content,
              contentType: res.contentType,
              headers: res.headers,
              customParams: customParams
            });
          } catch (error: any) {
            // Clear timeout on error
            clearTimeout(timeoutId);
            
            logger.error(`❌ Promise rejected: ${error}`, 'rnode_server::handler');
            return JSON.stringify({
              content: error.message || 'Handler execution failed',
              contentType: 'text/plain',
              status: 500, // Internal Server Error
              error: 'execution_failed'
            });
          }
        } else {
          // Synchronous result - clear timeout
          clearTimeout(timeoutId);
          
          // Check if operation was aborted
          if (req.abortController?.signal.aborted) {
            logger.warn('⚠️ Handler was aborted due to timeout', 'rnode_server::handler');
            return JSON.stringify({
              content: `Handler timeout after ${timeout}ms`,
              contentType: 'text/plain'
            });
          }
          
          // Synchronous result
          return JSON.stringify({
            content: res.content,
            contentType: res.contentType,
            headers: res.headers,
            customParams: customParams
          });
        }
      } catch (error: any) {
        logger.error(`❌ Handler execution error: ${error}`, 'rnode_server::handler');
        return JSON.stringify({
          content: 'Internal Server Error',
          contentType: 'text/plain'
        });
      }
    }

    // Only return "Not Found" if no handler was found
    return JSON.stringify({
      content: 'Not Found',
      contentType: 'text/plain'
    });
    
  } catch (error: any) {
    logger.error(`❌ getHandler error: ${error}`, 'rnode_server::handler');
    return JSON.stringify({
      content: 'Invalid request JSON',
      contentType: 'text/plain'
    });
  }
}
