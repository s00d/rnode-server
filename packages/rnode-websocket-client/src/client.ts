import { logger } from './core/logger';
import { WebSocketOptions, ConnectionState, ConnectionStatus } from './core/types';
import { EventEmitter } from './core/events';
import { ConnectionManager } from './connection/manager';
import { RoomManager } from './connection/rooms';
import { MessageManager } from './connection/messages';
import { PingPongManager } from './connection/pingpong';
import { ReconnectionManager } from './connection/reconnection';

export class RNodeWebSocketClient extends EventEmitter {
  private options: WebSocketOptions;
  private connectionManager: ConnectionManager;
  private roomManager: RoomManager;
  private messageManager: MessageManager;
  private pingPongManager: PingPongManager;
  private reconnectionManager: ReconnectionManager;

  constructor(options: WebSocketOptions) {
    super();
    
    this.options = {
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      pingInterval: 30000,
      pongTimeout: 10000,
      ...options
    };

    // Initialize managers
    this.connectionManager = new ConnectionManager(this.options);
    this.roomManager = new RoomManager(this.connectionManager, this.options);
    this.pingPongManager = new PingPongManager(this.connectionManager, this.options);
    this.messageManager = new MessageManager(this.connectionManager, this.options, this.pingPongManager);
    this.reconnectionManager = new ReconnectionManager(this.connectionManager, this.options, this.roomManager);

    // Setup event handlers
    this.setupEventHandlers();

    // Set disconnect callback for reconnection
    this.connectionManager.setDisconnectCallback(() => {
      if (this.options.autoReconnect) {
        this.reconnectionManager.scheduleReconnect();
      }
    });

    logger.info('🔌 RNode WebSocket Client initialized', 'client');
  }

  /**
   * Setup event handlers from managers
   */
  private setupEventHandlers(): void {
    // Proxy events from managers
    this.messageManager.on('welcome', (data: unknown) => this.emit('welcome', data));
    this.messageManager.on('ping', (data: unknown) => this.emit('ping', data));
    this.messageManager.on('pong', (data: unknown) => this.emit('pong', data));
    this.messageManager.on('join_room', (data: unknown) => this.emit('join_room', data));
    this.messageManager.on('leave_room', (data: unknown) => this.emit('leave_room', data));
    this.messageManager.on('message', (data: unknown) => this.emit('message', data));
    this.messageManager.on('direct_message', (data: unknown) => this.emit('direct_message', data));
    this.messageManager.on('room_message', (data: unknown) => this.emit('room_message', data));
    this.messageManager.on('message_ack', (data: unknown) => this.emit('message_ack', data));
    this.messageManager.on('error', (data: unknown) => this.emit('error', data));

    this.reconnectionManager.on('reconnect', (data: unknown) => this.emit('reconnect', data));
    this.pingPongManager.on('ping', (data: unknown) => this.emit('ping', data));
    this.pingPongManager.on('pong', (data: unknown) => this.emit('pong', data));
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    await this.connectionManager.connect();
    
    // Setup message handler after connection
    this.messageManager.setupMessageHandlerAfterConnect();
    
    this.pingPongManager.start();
    
    // Generate connect event
    this.emit('connect', {
      url: this.options.url,
      clientId: this.options.clientId,
      timestamp: Date.now()
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    logger.info('🔌 Disconnecting from WebSocket server', 'client');
    
    this.pingPongManager.stop();
    this.reconnectionManager.cancelReconnect();
    this.connectionManager.disconnect();
  }

  /**
   * Send message
   */
  send(data: unknown, roomId?: string): boolean {
    return this.messageManager.send(data, roomId);
  }

  /**
   * Send message to room
   */
  sendToRoom(roomId: string, message: unknown): boolean {
    return this.messageManager.sendToRoom(roomId, message);
  }

  /**
   * Send direct message to client by ID
   */
  sendDirectMessage(clientId: string, message: unknown): boolean {
    return this.messageManager.sendDirectMessage(clientId, message);
  }

  /**
   * Join room
   */
  joinRoom(roomId: string): boolean {
    return this.roomManager.joinRoom(roomId);
  }

  /**
   * Leave room
   */
  leaveRoom(roomId?: string): boolean {
    return this.roomManager.leaveRoom(roomId);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.connectionManager.getState();
  }

  /**
   * Check connection
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  /**
   * Get current room
   */
  getCurrentRoom(): string | null {
    return this.roomManager.getCurrentRoom();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    const status = this.connectionManager.getConnectionStatus();
    return {
      ...status,
      isReconnecting: this.reconnectionManager.getIsReconnecting()
    };
  }

  /**
   * Get ping/pong latency
   */
  getLatency(): number {
    return this.pingPongManager.getLatency();
  }

  /**
   * Update configuration
   */
  updateOptions(newOptions: Partial<WebSocketOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Update configuration in managers
    this.reconnectionManager.updateConfig(newOptions);
    
    // Restart ping/pong if interval changed
    if (newOptions.pingInterval !== undefined) {
      this.pingPongManager.stop();
      this.pingPongManager.start();
    }
    
    logger.info('🔧 WebSocket options updated', 'client');
  }

  /**
   * Get statistics
   */
  getStats(): {
    connection: ConnectionStatus;
    latency: number;
    reconnectionAttempts: number;
    maxReconnectionAttempts: number;
  } {
    return {
      connection: this.getConnectionStatus(),
      latency: this.getLatency(),
      reconnectionAttempts: this.reconnectionManager.getCurrentAttempt(),
      maxReconnectionAttempts: this.reconnectionManager.getMaxAttempts()
    };
  }
}
