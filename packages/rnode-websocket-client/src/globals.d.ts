// Global types for browser
declare global {
  interface Window {
    RNodeWebSocketClient: any;
    createWebSocketClient: any;
    WebSocketUtils: any;
    WebSocketLogger: any;
    WebSocketLogLevel: any;
  }
}

// Export for module
export {};
