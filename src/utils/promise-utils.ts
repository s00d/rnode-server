import { logger } from './logger';

// Global promise counter for logging
let nextPromiseId = 1;

export function getNextPromiseId(): string {
  return `promise_${nextPromiseId++}_${Date.now()}`;
}

export function getNextMiddlewarePromiseId(): string {
  return `middleware_promise_${nextPromiseId++}_${Date.now()}`;
}

export function setupPromiseTimeout(
  promise: Promise<any>, 
  promiseId: string, 
  timeout: number, 
  abortController: AbortController,
  onSuccess: (value: any) => void,
  onError: (error: any) => void
): void {
  logger.debug(`⏰ Setting up timeout for promise ${promiseId}: ${timeout}ms`, 'rnode_server::promise');
  
  // Set up timeout to abort the request if it takes too long
  const timeoutId = setTimeout(() => {
    logger.debug(`🛑 Timeout reached for promise ${promiseId}, aborting request`, 'rnode_server::promise');
    abortController.abort();
    logger.debug(`🛑 Request ${promiseId} aborted due to timeout (${timeout}ms)`, 'rnode_server::promise');
  }, timeout);
  
  // Store result when promise resolves
  promise.then(
    (value: any) => {
      // Clear timeout since promise completed
      clearTimeout(timeoutId);
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        logger.debug(`🛑 Request ${promiseId} was aborted, stopping execution`, 'rnode_server::promise');
        return;
      }
      
      logger.debug(`✅ Promise ${promiseId} resolved successfully`, 'rnode_server::promise');
      onSuccess(value);
    },
    (error: any) => {
      // Clear timeout since promise completed
      clearTimeout(timeoutId);
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        logger.debug(`🛑 Request ${promiseId} was aborted, stopping execution`, 'rnode_server::promise');
        return;
      }
      
      logger.debug(`❌ Promise ${promiseId} rejected with error: ${error}`, 'rnode_server::promise');
      onError(error);
    }
  );
}
