import { RNodeWebSocketClient } from './client';
import { Logger, LogLevel } from './logger';
import type {
  WebSocketOptions,
  WebSocketEvent,
  WebSocketMessage,
  RoomInfo,
  ConnectionInfo,
  ReconnectConfig,
  PingPongConfig
} from './types';

// Создание экземпляра клиента с настройками по умолчанию
export function createWebSocketClient(options: WebSocketOptions) {
  return new RNodeWebSocketClient(options);
}

// Утилиты для работы с WebSocket
export const WebSocketUtils = {
  /**
   * Проверка поддержки WebSocket в браузере
   */
  isSupported(): boolean {
    return typeof WebSocket !== 'undefined';
  },

  /**
   * Получение состояния подключения в текстовом виде
   */
  getStateString(state: number): string {
    switch (state) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  },

  /**
   * Создание уникального ID для клиента
   */
  generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Валидация URL WebSocket
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';
    } catch {
      return false;
    }
  }
};

// Глобальные объекты для использования на странице
if (typeof window !== 'undefined') {
  // Глобальный класс WebSocket клиента - убираем двойную обертку
  (window as any).RNodeWebSocketClient = RNodeWebSocketClient;
  
  // Глобальная функция создания клиента
  (window as any).createWebSocketClient = createWebSocketClient;
  
  // Глобальные утилиты
  (window as any).WebSocketUtils = WebSocketUtils;
  
  // Глобальный логгер
  (window as any).WebSocketLogger = Logger;
  (window as any).WebSocketLogLevel = LogLevel;
  
  // Проверяем, что класс действительно доступен как конструктор
  console.log('🔌 RNode WebSocket Client глобально доступен на странице');
  console.log('📖 Доступные глобальные объекты:');
  console.log('   - window.RNodeWebSocketClient:', typeof (window as any).RNodeWebSocketClient);
  console.log('   - window.createWebSocketClient():', typeof (window as any).createWebSocketClient);
  console.log('   - window.WebSocketUtils:', typeof (window as any).WebSocketUtils);
  console.log('   - window.WebSocketLogger:', typeof (window as any).WebSocketLogger);
  
  // Тестируем создание экземпляра
  try {
    const testClient = new (window as any).RNodeWebSocketClient({ url: 'ws://test' });
    console.log('✅ RNodeWebSocketClient успешно создан как конструктор');
  } catch (error) {
    console.error('❌ RNodeWebSocketClient не является конструктором:', error);
  }
}

// Экспорт для модульных систем
export {
  RNodeWebSocketClient,
  Logger,
  LogLevel
};
