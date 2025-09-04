import { logger } from '../core/logger';
import { WebSocketMessage, WebSocketOptions, WebSocketEvent, WelcomeMessage, RoomMessageEvent, DirectMessageEvent, MessageAckEvent, ServerErrorEvent } from '../core/types';
import { ConnectionManager } from './manager';
import { PingPongManager } from './pingpong';
import { EventEmitter } from '../core/events';

export class MessageManager extends EventEmitter {
  private connectionManager: ConnectionManager;
  private options: WebSocketOptions;
  private pingPongManager: PingPongManager | undefined;

  constructor(connectionManager: ConnectionManager, options: WebSocketOptions, pingPongManager?: PingPongManager) {
    super();
    this.connectionManager = connectionManager;
    this.options = options;
    this.pingPongManager = pingPongManager;
    // Don't setup handler here as WebSocket is not created yet
  }

  /**
   * Setup message handler
   */
  private setupMessageHandler(): void {
    const ws = this.connectionManager.getWebSocket();
    if (!ws) {
      logger.error('❌ WebSocket not available for message handler', 'messages');
      return;
    }

    ws.onmessage = (event) => {
      try {
        logger.debug(`📨 Raw message received: ${event.data}`, 'messages');
        const message: WebSocketMessage = JSON.parse(event.data);
        logger.debug(`📨 Message parsed: ${message.type}`, 'messages');
        
        this.handleMessage(message);
      } catch (error) {
        logger.error(`❌ Error parsing message: ${error}`, 'messages');
      }
    };
  }

  /**
   * Public method to setup message handler after connection
   */
  public setupMessageHandlerAfterConnect(): void {
    logger.info('🔧 Setting up message handler after connection', 'messages');
    this.setupMessageHandler();
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage): void {
    logger.debug(`🔍 Handling message type: ${message.type}`, 'messages');
    switch (message.type) {
      case 'welcome':
        logger.debug('🎯 Welcome case matched', 'messages');
        this.handleWelcome(message as WelcomeMessage);
        break;
      case 'ping':
        this.handlePing(message);
        break;
      case 'pong':
        this.handlePong(message);
        break;
      case 'room_joined':
        this.handleRoomJoined(message);
        break;
      case 'room_left':
        this.handleRoomLeft(message);
        break;
      case 'room_message':
        this.handleRoomMessage(message as unknown as RoomMessageEvent);
        break;
      case 'message_ack':
        logger.debug('✅ Message ack case matched', 'messages');
        this.handleMessageAck(message as unknown as MessageAckEvent);
        break;
      case 'direct_message':
        this.handleDirectMessage(message as unknown as DirectMessageEvent);
        break;
      case 'error':
        this.handleServerError(message as unknown as ServerErrorEvent);
        break;
      default:
        this.handleGenericMessage(message);
        break;
    }
  }

  /**
   * Handle welcome message
   */
  private handleWelcome(message: WelcomeMessage): void {
    logger.info('👋 Welcome message received', 'messages');
    logger.debug(`👋 Welcome message data: ${JSON.stringify(message)}`, 'messages');
    this.emit('welcome', message);
    
    if (this.options.onWelcome) {
      logger.info('👋 Calling onWelcome callback', 'messages');
      this.options.onWelcome(message);
    } else {
      logger.warn('⚠️ onWelcome callback not set', 'messages');
    }
  }

  /**
   * Handle ping message
   */
  private handlePing(message: WebSocketMessage): void {
    logger.info('🏓 Ping received from server', 'messages');
    
    // Use new method for handling ping from server
    if (this.pingPongManager) {
      this.pingPongManager.handlePingFromServer();
    }
    
    this.emit('ping', message);
  }

  /**
   * Handle pong message
   */
  private handlePong(message: WebSocketMessage): void {
    if (this.pingPongManager) {
      this.pingPongManager.handlePongFromServer();
    }
    this.emit('pong', message);
  }

  /**
   * Handle room joined message
   */
  private handleRoomJoined(message: WebSocketMessage): void {
    logger.info('🏠 Room joined message received', 'messages');
    const roomEvent = { roomId: message.room_id as string, timestamp: Date.now() };
    this.emit('join_room', roomEvent);
    
    if (this.options.onJoinRoom) {
      this.options.onJoinRoom(roomEvent);
    }
  }

  /**
   * Handle room left message
   */
  private handleRoomLeft(message: WebSocketMessage): void {
    logger.info('🚪 Room left message received', 'messages');
    const roomEvent = { roomId: message.room_id as string, timestamp: Date.now() };
    this.emit('leave_room', roomEvent);
    
    if (this.options.onLeaveRoom) {
      this.options.onLeaveRoom(roomEvent);
    }
  }

  /**
   * Handle room message
   */
  private handleRoomMessage(message: RoomMessageEvent): void {
    logger.info('📨 Room message received', 'messages');
    this.emit('room_message', message);
    
    if (this.options.onRoomMessage) {
      this.options.onRoomMessage(message);
    }
  }

  /**
   * Handle message acknowledgment
   */
  private handleMessageAck(message: MessageAckEvent): void {
    logger.info('✅ Message acknowledgment received', 'messages');
    logger.debug(`✅ Message ack data: ${JSON.stringify(message)}`, 'messages');
    
    // Check if this is a pong acknowledgment
    if (message.message && typeof message.message === 'string') {
      logger.debug(`🔍 Checking message: ${message.message}`, 'messages');
      try {
        const ackedMessage = JSON.parse(message.message);
        logger.debug(`🔍 Parsed acked message: ${JSON.stringify(ackedMessage)}`, 'messages');
        if (ackedMessage.type === 'pong') {
          logger.debug('🏓 Pong acknowledgment received', 'messages');
          // Call pong handler
          if (this.pingPongManager) {
            logger.debug('🏓 Calling handlePongFromServer', 'messages');
            this.pingPongManager.handlePongFromServer();
          } else {
            logger.warn('⚠️ PingPongManager not available', 'messages');
          }
        } else {
          logger.debug(`✅ Regular message ack for type: ${ackedMessage.type}`, 'messages');
        }
      } catch (error) {
        logger.debug(`❌ Error parsing acked message: ${error}`, 'messages');
      }
    } else {
      logger.debug('✅ Message ack without message field', 'messages');
    }
    
    this.emit('message_ack', message);
    
    if (this.options.onMessageAck) {
      this.options.onMessageAck(message);
    }
  }

  /**
   * Handle direct message
   */
  private handleDirectMessage(message: DirectMessageEvent): void {
    logger.info('📨 Direct message received', 'messages');
    this.emit('direct_message', message);
    
    if (this.options.onDirectMessage) {
      this.options.onDirectMessage(message);
    }
  }

  /**
   * Handle server error
   */
  private handleServerError(message: ServerErrorEvent): void {
    logger.error(`❌ Server error: ${message.error} (${message.error_type})`, 'messages');
    this.emit('error', message);
    
    if (this.options.onServerError) {
      this.options.onServerError(message);
    }
  }

  /**
   * Handle generic message
   */
  private handleGenericMessage(message: WebSocketMessage): void {
    if (this.options.onMessage) {
      const wsEvent: WebSocketEvent = {
        type: 'message',
        data: message,
        timestamp: Date.now()
      };
      this.options.onMessage(wsEvent);
    }
    
    this.emit('message', message);
  }

  /**
   * Send message
   */
  send(data: unknown, roomId?: string): boolean {
    const ws = this.connectionManager.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'messages');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'message',
        data,
        timestamp: new Date().toISOString(),
        room_id: roomId || this.connectionManager.getCurrentRoom() || null  // snake_case
      };

      ws.send(JSON.stringify(message));
      logger.debug(`📤 Message sent: ${JSON.stringify(data).substring(0, 100)}...`, 'messages');
      return true;
    } catch (error) {
      logger.error(`❌ Error sending message: ${error}`, 'messages');
      return false;
    }
  }

  /**
   * Send message to room
   */
  sendToRoom(roomId: string, message: unknown): boolean {
    const ws = this.connectionManager.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'messages');
      return false;
    }

    try {
      const wsMessage: WebSocketMessage = {
        type: 'room_message',
        data: message,
        timestamp: new Date().toISOString(),
        room_id: roomId  // Use snake_case for server compatibility
      };

      ws.send(JSON.stringify(wsMessage));
      logger.debug(`📤 Room message sent to ${roomId}: ${JSON.stringify(message).substring(0, 100)}...`, 'messages');
      return true;
    } catch (error) {
      logger.error(`❌ Error sending room message: ${error}`, 'messages');
      return false;
    }
  }

  /**
   * Send direct message to client by ID
   */
  sendDirectMessage(clientId: string, message: unknown): boolean {
    const ws = this.connectionManager.getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'messages');
      return false;
    }

    try {
      const wsMessage: WebSocketMessage = {
        type: 'direct_message',
        data: message,
        timestamp: new Date().toISOString(),
        target_client_id: clientId  // Use snake_case for server compatibility
      };

      ws.send(JSON.stringify(wsMessage));
      logger.debug(`📤 Direct message sent to client ${clientId}: ${message}`, 'messages');
      return true;
    } catch (error) {
      logger.error(`❌ Error sending direct message: ${error}`, 'messages');
      return false;
    }
  }
}
