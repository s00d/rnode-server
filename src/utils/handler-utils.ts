import { logger } from './logger';
import { Request } from './request';
import { Response } from './response';
import { createRequestObject, createResponseObject } from './request-response-factory';
import { getNextPromiseId, setupPromiseTimeout } from './promise-utils';
import * as addon from '../load.cjs';
import { handlers } from './global-utils';

export function getHandler(requestJson: string, timeout: number): string {
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
        const result = handler.handler(req, res);
        
        // Check if handler returned a promise
        if (result !== undefined && result !== null && typeof result === 'object' && typeof result.then === 'function') {
          // Handler returned a promise - we can't wait for it synchronously
          // Instead, we'll return immediately and let the promise resolve in background
          const promiseId = getNextPromiseId();
          const promise = result as Promise<any>;
          
          logger.debug(`🔄 Handler returned promise ${promiseId}, returning immediately`, 'rnode_server::handler');
          
          // Set up timeout to abort the request if it takes too long
          setupPromiseTimeout(
            promise,
            promiseId,
            timeout,
            req.abortController!,
            (value: any) => {
              // Вызываем Rust функцию для установки результата
              const result = {
                content: res.content,
                contentType: res.contentType,
                headers: res.headers,
                customParams: customParams
              };
              
              try {
                addon.setPromiseResult(promiseId, JSON.stringify(result));
                logger.debug(`✅ Promise ${promiseId} resolved with result`, 'rnode_server::handler');
              } catch (error) {
                logger.error(`❌ Failed to set promise result: ${error}`, 'rnode_server::handler');
              }
            },
            (error: any) => {
              // Вызываем Rust функцию для установки ошибки
              try {
                addon.setPromiseError(promiseId, error.message || String(error));
                logger.error(`❌ Promise ${promiseId} rejected: ${error}`, 'rnode_server::handler');
              } catch (error) {
                logger.error(`❌ Failed to set promise error: ${error}`, 'rnode_server::handler');
              }
            }
          );
          
          // Return a response indicating the operation is in progress
          return JSON.stringify({
            content: `Async operation started. Promise ID: ${promiseId}`,
            contentType: 'text/plain',
            headers: res.headers,
            customParams: customParams,
            __async: true,
            __promiseId: promiseId,
            __status: 'started'
          });
        }
        
        return JSON.stringify({
          content: res.content,
          contentType: res.contentType,
          headers: res.headers,
          customParams: customParams
        });
      } catch (error) {
        return JSON.stringify({
          content: 'Internal Server Error',
          contentType: 'text/plain'
        });
      }
    }

    return JSON.stringify({
      content: 'Not Found',
      contentType: 'text/plain'
    });
  } catch (error) {
    return JSON.stringify({
      content: 'Invalid request JSON',
      contentType: 'text/plain'
    });
  }
}
