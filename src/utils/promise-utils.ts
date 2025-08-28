import { logger } from './logger';

// Простые утилиты для работы с промисами
export function createPromise<T>(
  executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void
): Promise<T> {
  return new Promise(executor);
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function timeoutPromise<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  errorMessage?: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

export function retryPromise<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const attempt = () => {
      attempts++;
      fn()
        .then(resolve)
        .catch((error) => {
          if (attempts >= maxRetries) {
            reject(error);
          } else {
            setTimeout(attempt, delayMs);
          }
        });
    };
    
    attempt();
  });
}

// Утилита для логирования промисов
export function logPromise<T>(
  promise: Promise<T>, 
  operationName: string
): Promise<T> {
  const startTime = Date.now();
  logger.debug(`🚀 Starting operation: ${operationName}`, 'rnode_server::promise');
  
  return promise
    .then((result) => {
      const duration = Date.now() - startTime;
      logger.debug(`✅ Operation ${operationName} completed successfully in ${duration}ms`, 'rnode_server::promise');
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      logger.debug(`❌ Operation ${operationName} failed after ${duration}ms: ${error}`, 'rnode_server::promise');
      throw error;
    });
}
