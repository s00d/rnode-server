import { logger } from '../core/logger';
import { WebSocketMessage, WebSocketOptions, RoomEvent } from '../core/types';
import { ConnectionManager } from './manager';

export class RoomManager {
  private connectionManager: ConnectionManager;
  private options: WebSocketOptions;

  constructor(connectionManager: ConnectionManager, options: WebSocketOptions) {
    this.connectionManager = connectionManager;
    this.options = options;
  }

  /**
   * Join room
   */
  joinRoom(roomId: string): boolean {
    const ws = this.connectionManager.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'rooms');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'join_room',
        room_id: roomId,  // Use snake_case in root object
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(message));
      this.connectionManager.setCurrentRoom(roomId);
      
      logger.info(`🔗 Joined room: ${roomId}`, 'rooms');
      
          // Call user handler
    if (this.options.onJoinRoom) {
        const roomEvent: RoomEvent = { roomId, timestamp: Date.now() };
        this.options.onJoinRoom(roomEvent);
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Error joining room: ${error}`, 'rooms');
      return false;
    }
  }

  /**
   * Leave room
   */
  leaveRoom(roomId?: string): boolean {
    const ws = this.connectionManager.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'rooms');
      return false;
    }

    const targetRoom = roomId || this.connectionManager.getCurrentRoom();
    if (!targetRoom) {
      logger.warn('⚠️ Not in any room', 'rooms');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'leave_room',
        room_id: targetRoom,  // Use snake_case in root object
        timestamp: new Date().toISOString()
      };

      ws.send(JSON.stringify(message));
      
      if (targetRoom === this.connectionManager.getCurrentRoom()) {
        this.connectionManager.setCurrentRoom(null);
      }
      
      logger.info(`🚪 Left room: ${targetRoom}`, 'rooms');
      
          // Call user handler
    if (this.options.onLeaveRoom) {
        const roomEvent: RoomEvent = { roomId: targetRoom, timestamp: Date.now() };
        this.options.onLeaveRoom(roomEvent);
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Error leaving room: ${error}`, 'rooms');
      return false;
    }
  }

  /**
   * Get current room
   */
  getCurrentRoom(): string | null {
    return this.connectionManager.getCurrentRoom();
  }

  /**
   * Check if in room
   */
  isInRoom(roomId?: string): boolean {
    const currentRoom = this.connectionManager.getCurrentRoom();
    return roomId ? currentRoom === roomId : currentRoom !== null;
  }
}
