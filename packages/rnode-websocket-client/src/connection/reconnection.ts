import { logger } from '../core/logger';
import { WebSocketOptions, ReconnectEvent } from '../core/types';
import { ConnectionManager } from './manager';
import { RoomManager } from './rooms';
import { EventEmitter } from '../core/events';

export class ReconnectionManager extends EventEmitter {
  private connectionManager: ConnectionManager;
  private roomManager: RoomManager;
  private options: WebSocketOptions;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private currentAttempt: number = 0;
  private previousRooms: string[] = [];  // Save rooms for restoration

  constructor(connectionManager: ConnectionManager, options: WebSocketOptions, roomManager?: RoomManager) {
    super();
    this.connectionManager = connectionManager;
    this.roomManager = roomManager || new RoomManager(connectionManager, options);
    this.options = options;
  }

  /**
   * Save current rooms before reconnection
   */
  private saveCurrentRooms(): void {
    const currentRoom = this.roomManager.getCurrentRoom();
    if (currentRoom) {
      this.previousRooms = [currentRoom];
      logger.debug(`💾 Saved room for reconnection: ${currentRoom}`, 'reconnection');
    }
  }

  /**
   * Restore rooms after reconnection
   */
  private async restoreRooms(): Promise<void> {
    if (this.previousRooms.length > 0) {
      logger.debug(`🔄 Restoring ${this.previousRooms.length} rooms after reconnection`, 'reconnection');
      
      for (const roomId of this.previousRooms) {
        try {
          await this.roomManager.joinRoom(roomId);
          logger.debug(`✅ Restored room: ${roomId}`, 'reconnection');
        } catch (error) {
          logger.error(`❌ Failed to restore room ${roomId}: ${error}`, 'reconnection');
        }
      }
    }
  }

  /**
   * Schedule reconnection
   */
  scheduleReconnect(): void {
    if (!this.options.autoReconnect) return;
    
    if (this.currentAttempt >= (this.options.reconnectAttempts || 5)) {
      logger.error(`❌ Max reconnection attempts reached (${this.options.reconnectAttempts})`, 'reconnection');
      return;
    }
    
    this.isReconnecting = true;
    this.currentAttempt++;
    
    // Save current rooms before reconnection
    this.saveCurrentRooms();
    
    const delay = (this.options.reconnectDelay || 1000) * Math.pow(2, this.currentAttempt - 1);
    logger.info(`🔄 Reconnecting in ${delay}ms (attempt ${this.currentAttempt}/${this.options.reconnectAttempts})`, 'reconnection');
    
    // Generate reconnect event
    const reconnectEvent: ReconnectEvent = {
      attempt: this.currentAttempt,
      maxAttempts: this.options.reconnectAttempts || 5,
      delay,
      timestamp: Date.now()
    };
    this.emit('reconnect', reconnectEvent);
    
    // Call user handler
    if (this.options.onReconnect) {
      this.options.onReconnect(reconnectEvent);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.performReconnect();
    }, delay);
  }

  /**
   * Execute reconnection
   */
  private async performReconnect(): Promise<void> {
    try {
      await this.connectionManager.connect();
      
      // Restore rooms after successful reconnection
      await this.restoreRooms();
      
      this.resetReconnection();
    } catch (error) {
      logger.error(`❌ Reconnection failed: ${error}`, 'reconnection');
      this.scheduleReconnect();
    }
  }

  /**
   * Reset reconnection state
   */
  resetReconnection(): void {
    this.isReconnecting = false;
    this.currentAttempt = 0;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    logger.info('✅ Reconnection successful', 'reconnection');
  }

  /**
   * Cancel reconnection
   */
  cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isReconnecting = false;
    this.currentAttempt = 0;
    
    logger.debug('🛑 Reconnection cancelled', 'reconnection');
  }

  /**
   * Check reconnection state
   */
  getIsReconnecting(): boolean {
    return this.isReconnecting;
  }

  /**
   * Get current attempt
   */
  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  /**
   * Get maximum attempts
   */
  getMaxAttempts(): number {
    return this.options.reconnectAttempts || 5;
  }

  /**
   * Update reconnection configuration
   */
  updateConfig(newOptions: Partial<WebSocketOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}
