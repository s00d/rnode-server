// Глобальные типы для браузера
declare global {
  interface Window {
    RNodeWebSocketClient: any;
    createWebSocketClient: any;
    WebSocketUtils: any;
    WebSocketLogger: any;
    WebSocketLogLevel: any;
  }
}

// Экспорт для модуля
export {};
