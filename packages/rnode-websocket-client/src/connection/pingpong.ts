import { logger } from '../core/logger';
import { WebSocketMessage, WebSocketOptions, PingEvent, PongEvent } from '../core/types';
import { ConnectionManager } from './manager';
import { EventEmitter } from '../core/events';

export class PingPongManager extends EventEmitter {
  private connectionManager: ConnectionManager;
  private options: WebSocketOptions;
  private pongTimer: NodeJS.Timeout | null = null;
  private lastPing: number = 0;
  private lastPong: number = 0;
  private pongTimeoutId: NodeJS.Timeout | null = null;

  constructor(connectionManager: ConnectionManager, options: WebSocketOptions) {
    super();
    this.connectionManager = connectionManager;
    this.options = options;
  }

  /**
   * Start ping/pong mechanism (client only responds to server ping)
   */
  start(): void {
    logger.debug('🏓 Ping/pong mechanism started (client responds to server pings)', 'pingpong');
  }

  /**
   * Stop ping/pong mechanism
   */
  stop(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
    
    logger.debug('🏓 Ping/pong mechanism stopped', 'pingpong');
  }

  /**
   * Handle ping from server (client only responds)
   */
  handlePingFromServer(): void {
    this.lastPing = Date.now();
    
    // Send pong in response
    this.sendPong();
    
    // Set timeout for waiting for next ping
    if (this.options.pongTimeout) {
      this.pongTimeoutId = setTimeout(() => {
        logger.warn('⚠️ No ping received from server, connection may be stale', 'pingpong');
        const ws = this.connectionManager.getWebSocket();
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'No ping from server');
        }
      }, this.options.pongTimeout);
    }
    
    logger.debug('🏓 Ping received from server, pong sent', 'pingpong');
    
    // Generate ping event
    const pingEvent: PingEvent = { timestamp: this.lastPing };
    this.emit('ping', pingEvent);
    
    // Call user handler
    if (this.options.onPing) {
      this.options.onPing(pingEvent);
    }
  }

  /**
   * Send pong in response to ping from server
   */
  private sendPong(): void {
    const ws = this.connectionManager.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    try {
      const pongMessage: WebSocketMessage = {
        type: 'pong',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      };
      
      ws.send(JSON.stringify(pongMessage));
      logger.debug('🏓 Pong sent to server', 'pingpong');
    } catch (error) {
      logger.error(`❌ Error sending pong: ${error}`, 'pingpong');
    }
  }

  /**
   * Handle pong from server (for confirmation)
   */
  handlePongFromServer(): void {
    this.lastPong = Date.now();
    
    // Clear timeout since we received pong from server
    if (this.pongTimeoutId) {
      clearTimeout(this.pongTimeoutId);
      this.pongTimeoutId = null;
    }
    
    const latency = this.lastPong - this.lastPing;
    logger.debug(`🏓 Pong received from server, latency: ${latency}ms`, 'pingpong');
    
    // Generate pong event
    const pongEvent: PongEvent = { latency, timestamp: this.lastPong };
    this.emit('pong', pongEvent);
    
    // Call user handler
    if (this.options.onPong) {
      this.options.onPong(pongEvent);
    }
  }

  /**
   * Get last ping
   */
  getLastPing(): number {
    return this.lastPing;
  }

  /**
   * Get last pong
   */
  getLastPong(): number {
    return this.lastPong;
  }

  /**
   * Get current latency
   */
  getLatency(): number {
    if (this.lastPing === 0 || this.lastPong === 0) return 0;
    return this.lastPong - this.lastPing;
  }

  /**
   * Check ping/pong activity
   */
  isActive(): boolean {
    return this.pongTimeoutId !== null;
  }
}
