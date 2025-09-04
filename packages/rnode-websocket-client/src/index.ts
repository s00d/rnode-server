import { RNodeWebSocketClient } from './client';
import { Logger, LogLevel } from './core/logger';
import { WebSocketUtils } from './utils/websocket';
import type {
  WebSocketOptions
} from './core/types';

// Main exports
export { RNodeWebSocketClient } from './client';
export { Logger, LogLevel } from './core/logger';
export { WebSocketUtils } from './utils/websocket';
export { EventEmitter } from './core/events';

// Types
export type {
  WebSocketOptions,
  WebSocketEvent,
  WebSocketMessage,
  WelcomeMessage,
  RoomInfo,
  ConnectionInfo,
  ReconnectConfig,
  PingPongConfig,
  ReconnectEvent,
  RoomEvent,
  PingEvent,
  PongEvent,
  MessageAckEvent,
  RoomMessageEvent,
  DirectMessageEvent,
  ServerErrorEvent,
  MessageBlockedEvent,
  ConnectionStatus,
  MessageHandler
} from './core/types';

export { ConnectionState } from './core/types';

// Managers (for internal use)
export { ConnectionManager } from './connection/manager';
export { RoomManager } from './connection/rooms';
export { MessageManager } from './connection/messages';
export { PingPongManager } from './connection/pingpong';
export { ReconnectionManager } from './connection/reconnection';

// Create client instance with default settings
export function createWebSocketClient(options: WebSocketOptions): RNodeWebSocketClient {
  return new RNodeWebSocketClient(options);
}

// Global objects for use on page
if (typeof window !== 'undefined') {
      // Global WebSocket client class
    (window as any).RNodeWebSocketClient = RNodeWebSocketClient;
  
      // Global client creation function
    (window as any).createWebSocketClient = createWebSocketClient;
  
      // Global utilities
    (window as any).WebSocketUtils = WebSocketUtils;
  
      // Global logger
    (window as any).WebSocketLogger = Logger;
  (window as any).WebSocketLogLevel = LogLevel;
  
      // Check that class is actually available as constructor
    console.log('🔌 RNode WebSocket Client глобально доступен на странице');
  console.log('📖 Доступные глобальные объекты:');
  console.log('   - window.RNodeWebSocketClient:', typeof (window as any).RNodeWebSocketClient);
  console.log('   - window.createWebSocketClient():', typeof (window as any).createWebSocketClient);
  console.log('   - window.WebSocketUtils:', typeof (window as any).WebSocketUtils);
  console.log('   - window.WebSocketLogger:', typeof (window as any).WebSocketLogger);
}

