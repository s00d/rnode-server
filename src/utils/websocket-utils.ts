import { logger } from './logger';
import { websocketCallbacks } from './global-utils';

export interface WebSocketEventResult {
  shouldContinue: boolean;
  shouldCancel?: boolean;
  modifiedEvent?: any;
  error?: string;
  status?: number;
}

// Вспомогательная функция для обработки результата колбека
function processCallbackResult(callbackResult: any, result: WebSocketEventResult): void {
  if (callbackResult && typeof callbackResult === 'object') {
    if (callbackResult.shouldCancel) {
      result.shouldCancel = true;
      result.shouldContinue = false;
    }
    if (callbackResult.modifiedEvent) {
      result.modifiedEvent = callbackResult.modifiedEvent;
      result.shouldContinue = true; // Продолжаем с измененными данными
    }
    if (callbackResult.error) {
      result.error = callbackResult.error;
    }
  }
  // Если колбек не вернул результат или вернул undefined - продолжаем выполнение
  // Если колбек вернул объект с shouldCancel: false - продолжаем выполнение
}

export async function executeWebSocketEvent(eventJson: string, timeout: number): Promise<string> {
  logger.debug('🔌 executeWebSocketEvent function called with eventJson length:' + eventJson.length);
  
  // Объявляем timeoutId в начале функции
  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    const eventData = JSON.parse(eventJson);
    const eventType = eventData.type;
    const path = eventData.path;
    
    logger.debug(`🔌 executeWebSocketEvent called with type: ${eventType}, path: ${path}`, 'rnode_server::websocket');

    // Получаем колбеки для данного пути
    const callbacks = websocketCallbacks.get(path);
    if (!callbacks) {
      logger.warn(`⚠️ No WebSocket callbacks found for path: ${path}`, 'rnode_server::websocket');
      return JSON.stringify({
        shouldContinue: true,
        shouldCancel: false,
        modifiedEvent: eventData
      });
    }

    // Создаем результат по умолчанию
    let result: WebSocketEventResult = {
      shouldContinue: true,
      shouldCancel: false,
      modifiedEvent: eventData
    };

    // Устанавливаем таймаут
    timeoutId = setTimeout(() => {
      logger.warn(`⚠️ WebSocket event timeout after ${timeout}ms`, 'rnode_server::websocket');
    }, timeout);

    try {
      // Вызываем соответствующий колбек в зависимости от типа события
      switch (eventType) {
        case 'connect':
          if (callbacks.onConnect) {
            try {
              const callbackResult = callbacks.onConnect(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onConnect callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onConnect callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'message':
          if (callbacks.onMessage) {
            try {
              const callbackResult = callbacks.onMessage(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onMessage callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onMessage callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'close':
          if (callbacks.onClose) {
            try {
              const callbackResult = callbacks.onClose(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onClose callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onClose callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'error':
          if (callbacks.onError) {
            try {
              const callbackResult = callbacks.onError(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onError callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onError callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'join_room':
          if (callbacks.onJoinRoom) {
            try {
              const callbackResult = callbacks.onJoinRoom(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onJoinRoom callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onJoinRoom callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'leave_room':
          if (callbacks.onLeaveRoom) {
            try {
              const callbackResult = callbacks.onLeaveRoom(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onLeaveRoom callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onLeaveRoom callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'ping':
          if (callbacks.onPing) {
            try {
              const callbackResult = callbacks.onPing(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onPing callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onPing callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'pong':
          if (callbacks.onPong) {
            try {
              const callbackResult = callbacks.onPong(eventData);
              
              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onPong callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onPong callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        case 'binary_message':
          if (callbacks.onBinaryMessage) {
            try {
              const callbackResult = callbacks.onBinaryMessage(eventData);

              // Проверяем, является ли результат промисом
              if (callbackResult && typeof callbackResult === 'object' && typeof (callbackResult as any).then === 'function') {
                // Асинхронный колбек - ждем результат
                try {
                  const resolvedResult = await callbackResult;
                  processCallbackResult(resolvedResult, result);
                } catch (error) {
                  logger.error(`❌ Error in async onBinaryMessage callback: ${error}`, 'rnode_server::websocket');
                  result.error = error instanceof Error ? error.message : String(error);
                  result.status = 500;
                  result.shouldCancel = true;
                  result.shouldContinue = false;
                }
              } else {
                // Синхронный колбек
                processCallbackResult(callbackResult, result);
              }
            } catch (error) {
              logger.error(`❌ Error in onBinaryMessage callback: ${error}`, 'rnode_server::websocket');
              result.error = error instanceof Error ? error.message : String(error);
              result.status = 500;
              result.shouldCancel = true;
              result.shouldContinue = false;
            }
          }
          break;
        default:
          logger.debug(`🔍 WebSocket event (not handled by callbacks): ${eventType}`, 'rnode_server::websocket');
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    logger.debug(`🔌 WebSocket event result: ${JSON.stringify(result)}`, 'rnode_server::websocket');
    return JSON.stringify(result);

  } catch (error) {
    // Очищаем таймаут в случае ошибки
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    logger.error(`❌ Error in executeWebSocketEvent: ${error instanceof Error ? error.message : String(error)}`, 'rnode_server::websocket');
    return JSON.stringify({
      shouldContinue: false,
      shouldCancel: true,
      error: error instanceof Error ? error.message : String(error),
      status: 500
    });
  }
}
