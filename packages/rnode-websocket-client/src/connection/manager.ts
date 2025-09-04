import { logger } from '../core/logger';
import { WebSocketOptions, WebSocketEvent, ConnectionState, ConnectionStatus } from '../core/types';

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private isConnecting: boolean = false;
  private currentRoom: string | null = null;
  private onDisconnectCallback?: () => void;

  constructor(options: WebSocketOptions) {
    this.options = options;
  }

  /**
   * Set disconnect handler
   */
  setDisconnectCallback(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      
      // Build URL with clientId if available
      let connectionUrl = this.options.url;
      if (this.options.clientId) {
        const separator = connectionUrl.includes('?') ? '&' : '?';
        connectionUrl = `${connectionUrl}${separator}clientId=${encodeURIComponent(this.options.clientId)}`;
      }
      
      logger.info(`🔌 Connecting to ${connectionUrl}`, 'connection');

      try {
        this.ws = new WebSocket(connectionUrl, this.options.protocols);
        this.setupEventHandlers(resolve, reject);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(resolve: () => void, _reject: (error: Error) => void): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      
      logger.info('✅ WebSocket connected', 'connection');
      
      // Call user handler
      if (this.options.onConnect) {
        const wsEvent: WebSocketEvent = {
          type: 'connect',
          data: { url: this.options.url, clientId: this.options.clientId },
          timestamp: Date.now()
        };
        this.options.onConnect(wsEvent);
      }
      
      resolve();
    };

    this.ws.onclose = (event) => {
      this.isConnecting = false;
      
      logger.warn(`🔌 WebSocket closed: ${event.code} ${event.reason}`, 'connection');
      
      // Call user handler
      if (this.options.onDisconnect) {
        const wsEvent: WebSocketEvent = {
          type: 'disconnect',
          data: { code: event.code, reason: event.reason, wasClean: event.wasClean },
          timestamp: Date.now()
        };
        this.options.onDisconnect(wsEvent);
      }
      
      // Call internal disconnect handler
      if (this.onDisconnectCallback) {
        this.onDisconnectCallback();
      }
    };

    this.ws.onerror = (error) => {
      this.isConnecting = false;
      logger.error(`❌ WebSocket error: ${error}`, 'connection');
      
      // Call user handler
      if (this.options.onError) {
        const wsEvent: WebSocketEvent = {
          type: 'error',
          data: { error: error.toString() },
          timestamp: Date.now()
        };
        this.options.onError(wsEvent);
      }
      
      // Don't reject promise on error as this may be a temporary issue
      // reject(new Error(`WebSocket connection failed: ${error}`));
    };

    // Add binary message handler
    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        logger.debug(`📦 Binary message received: ${event.data instanceof ArrayBuffer ? event.data.byteLength : 'blob'} bytes`, 'connection');
        
        // Call user handler for binary messages
        if (this.options.onBinaryMessage) {
          const wsEvent: WebSocketEvent = {
            type: 'binary_message',
            data: event.data,
            timestamp: Date.now()
          };
          this.options.onBinaryMessage(wsEvent);
        }
      }
    };
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    logger.info('🔌 Disconnecting from WebSocket server', 'connection');
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.currentRoom = null;
  }

  /**
   * Get WebSocket connection
   */
  getWebSocket(): WebSocket | null {
    return this.ws;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.ws ? this.ws.readyState : ConnectionState.CLOSED;
  }

  /**
   * Check connection
   */
  isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this.isConnected(),
      isConnecting: this.isConnecting,
      isReconnecting: false, // Managed by ReconnectionManager
      currentRoom: this.currentRoom,
      state: this.getState()
    };
  }

  /**
   * Set current room
   */
  setCurrentRoom(roomId: string | null): void {
    this.currentRoom = roomId;
  }

  /**
   * Get current room
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }
}
