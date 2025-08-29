import { WebSocketOptions, WebSocketEvent, WebSocketMessage, RoomInfo, ConnectionInfo, ReconnectConfig, PingPongConfig } from './types';
import { logger } from './logger';

export class RNodeWebSocketClient {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private reconnectConfig: ReconnectConfig;
  private pingPongConfig: PingPongConfig;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pongTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private isReconnecting: boolean = false;
  private currentRoom: string | null = null;
  
  // Система событий
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(options: WebSocketOptions) {
    this.options = {
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      pingInterval: 30000,
      pongTimeout: 10000,
      ...options
    };

    this.reconnectConfig = {
      enabled: this.options.autoReconnect!,
      interval: this.options.reconnectDelay!,
      maxAttempts: this.options.reconnectAttempts!,
      currentAttempt: 0
    };

    this.pingPongConfig = {
      enabled: true,
      interval: this.options.pingInterval!,
      timeout: this.options.pongTimeout!,
      lastPing: 0,
      lastPong: 0
    };

    logger.info('🔌 RNode WebSocket Client initialized', 'client');
  }

  /**
   * Подписка на события
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Отписка от событий
   */
  off(event: string, listener: Function): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Генерация событий
   */
  private emit(event: string, data?: any): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)!;
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error(`❌ Error in event listener for ${event}: ${error}`, 'client');
        }
      });
    }
  }

  /**
   * Подключение к WebSocket серверу
   */
  connect(): Promise<void> {
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
      
      // Формируем URL с clientId если он есть
      let connectionUrl = this.options.url;
      if (this.options.clientId) {
        const separator = connectionUrl.includes('?') ? '&' : '?';
        connectionUrl = `${connectionUrl}${separator}clientId=${encodeURIComponent(this.options.clientId)}`;
      }
      
      logger.info(`🔌 Connecting to ${connectionUrl}`, 'client');

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
   * Настройка обработчиков событий WebSocket
   */
  private setupEventHandlers(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnecting = false;
      this.isReconnecting = false;
      this.reconnectConfig.currentAttempt = 0;
      
      logger.info('✅ WebSocket connected', 'client');
      
      // Запускаем ping/pong
      this.startPingPong();
      
      // Генерируем событие connect
      this.emit('connect', {
        url: this.options.url,
        clientId: this.options.clientId,
        timestamp: Date.now()
      });
      
      // Вызываем пользовательский обработчик
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
      this.stopPingPong();
      
      logger.warn(`🔌 WebSocket closed: ${event.code} ${event.reason}`, 'client');
      
      // Вызываем пользовательский обработчик
      if (this.options.onDisconnect) {
        const wsEvent: WebSocketEvent = {
          type: 'disconnect',
          data: { code: event.code, reason: event.reason, wasClean: event.wasClean },
          timestamp: Date.now()
        };
        this.options.onDisconnect(wsEvent);
      }
      
      // Генерируем событие disconnect
      this.emit('disconnect', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: Date.now()
      });
      
      // Автоматическое переподключение
      if (this.reconnectConfig.enabled && !this.isReconnecting) {
        this.scheduleReconnect();
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        logger.debug(`📨 Message received: ${message.type}`, 'client');
        
        // Обработка welcome сообщения
        if (message.type === 'welcome') {
          logger.info('👋 Welcome message received', 'client');
          this.emit('welcome', message as any);
          
          // Вызываем пользовательский обработчик
          if (this.options.onWelcome) {
            this.options.onWelcome(message as any);
          }
          return;
        }
        
        // Обработка ping/pong
        if (message.type === 'ping') {
          logger.info('🏓 Ping received from server', 'client');
          // Отправляем pong в ответ
          this.sendPong();
          return;
        }
        
        if (message.type === 'pong') {
          this.handlePong();
          return;
        }
        
        // Обработка сообщений о комнатах от сервера
        if (message.type === 'room_joined') {
          logger.info('🏠 Room joined message received', 'client');
          this.emit('join_room', { roomId: message.room_id, timestamp: Date.now() });
          
          // Вызываем пользовательский обработчик
          if (this.options.onJoinRoom) {
            this.options.onJoinRoom({ roomId: message.room_id, timestamp: Date.now() });
          }
          return;
        }
        
        if (message.type === 'room_left') {
          logger.info('🚪 Room left message received', 'client');
          this.emit('leave_room', { roomId: message.room_id, timestamp: Date.now() });
          
          // Вызываем пользовательский обработчик
          if (this.options.onLeaveRoom) {
            this.options.onLeaveRoom({ roomId: message.room_id, timestamp: Date.now() });
          }
          return;
        }
        
        // Обработка сообщений в комнате от сервера
        if (message.type === 'room_message') {
          logger.info('📨 Room message received', 'client');
          this.emit('message', message);
          
          // Вызываем пользовательский обработчик для сообщений в комнате
          if (this.options.onRoomMessage) {
            this.options.onRoomMessage(message as any);
          }
          return;
        }
        
        // Обработка подтверждений сообщений от сервера
        if (message.type === 'message_ack') {
          logger.info('✅ Message acknowledgment received', 'client');
          
          // Вызываем пользовательский обработчик
          if (this.options.onMessageAck) {
            this.options.onMessageAck(message as any);
          }
          
          // Не вызываем onMessage для служебных сообщений
          return;
        }
        
        // Обработка прямых сообщений от сервера
        if (message.type === 'direct_message') {
          logger.info('📨 Direct message received', 'client');
          this.emit('message', message);
          
          // Вызываем пользовательский обработчик для прямых сообщений
          if (this.options.onDirectMessage) {
            this.options.onDirectMessage(message as any);
          }
          return;
        }
        
        // Вызываем пользовательский обработчик для остальных сообщений
        if (this.options.onMessage) {
          const wsEvent: WebSocketEvent = {
            type: 'message',
            data: message,
            timestamp: Date.now()
          };
          this.options.onMessage(wsEvent);
        }
        
        // Генерируем событие message
        this.emit('message', message);
      } catch (error) {
        logger.error(`❌ Error parsing message: ${error}`, 'client');
      }
    };

    this.ws.onerror = (error) => {
      this.isConnecting = false;
      logger.error(`❌ WebSocket error: ${error}`, 'client');
      
      // Вызываем пользовательский обработчик
      if (this.options.onError) {
        const wsEvent: WebSocketEvent = {
          type: 'error',
          data: { error: error.toString() },
          timestamp: Date.now()
        };
        this.options.onError(wsEvent);
      }
      
      reject(new Error(`WebSocket connection failed: ${error}`));
    };
  }

  /**
   * Отправка сообщения
   */
  send(data: any, roomId?: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'client');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'message',
        data,
        timestamp: new Date().toISOString(),
        roomId: roomId || this.currentRoom || undefined
      };

      this.ws.send(JSON.stringify(message));
      logger.debug(`📤 Message sent: ${JSON.stringify(data).substring(0, 100)}...`, 'client');
      return true;
    } catch (error) {
      logger.error(`❌ Error sending message: ${error}`, 'client');
      return false;
    }
  }

  /**
   * Подключение к комнате
   */
  joinRoom(roomId: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'client');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'join_room',
        data: { roomId },
        timestamp: new Date().toISOString()
      };

      this.ws.send(JSON.stringify(message));
      this.currentRoom = roomId;
      
      logger.info(`🔗 Joined room: ${roomId}`, 'client');
      
      // Генерируем событие
      this.emit('join_room', { roomId, timestamp: Date.now() });
      
      // Вызываем пользовательский обработчик
      if (this.options.onJoinRoom) {
        this.options.onJoinRoom({ roomId, timestamp: Date.now() });
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Error joining room: ${error}`, 'client');
      return false;
    }
  }

  /**
   * Выход из комнаты
   */
  leaveRoom(roomId?: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'client');
      return false;
    }

    const targetRoom = roomId || this.currentRoom;
    if (!targetRoom) {
      logger.warn('⚠️ Not in any room', 'client');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'leave_room',
        data: { roomId: targetRoom },
        timestamp: new Date().toISOString()
      };

      this.ws.send(JSON.stringify(message));
      
      if (targetRoom === this.currentRoom) {
        this.currentRoom = null;
      }
      
      logger.info(`🚪 Left room: ${targetRoom}`, 'client');
      
      // Генерируем событие
      this.emit('leave_room', { roomId: targetRoom, timestamp: Date.now() });
      
      // Вызываем пользовательский обработчик
      if (this.options.onLeaveRoom) {
        this.options.onLeaveRoom({ roomId: targetRoom, timestamp: Date.now() });
      }
      
      return true;
    } catch (error) {
      logger.error(`❌ Error leaving room: ${error}`, 'client');
      return false;
    }
  }

  /**
   * Отключение от сервера
   */
  disconnect(): void {
    logger.info('🔌 Disconnecting from WebSocket server', 'client');
    
    this.stopPingPong();
    this.cancelReconnect();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.isReconnecting = false;
    this.currentRoom = null;
  }

  /**
   * Получение текущего состояния подключения
   */
  getState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * Проверка подключения
   */
  isConnected(): boolean {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }

  /**
   * Получение текущей комнаты
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  /**
   * Запуск ping/pong механизма
   */
  private startPingPong(): void {
    if (!this.pingPongConfig.enabled) return;
    
    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.pingPongConfig.interval);
  }

  /**
   * Остановка ping/pong механизма
   */
  private stopPingPong(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  /**
   * Отправка ping
   */
  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      const pingMessage: WebSocketMessage = {
        type: 'ping',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(pingMessage));
      this.pingPongConfig.lastPing = Date.now();
      
      // Устанавливаем таймаут для pong
      this.pongTimer = setTimeout(() => {
        logger.warn('⚠️ Pong timeout, connection may be stale', 'client');
        this.ws?.close(1000, 'Pong timeout');
      }, this.pingPongConfig.timeout);
      
      logger.debug('🏓 Ping sent', 'client');
      
      // Генерируем событие ping
      this.emit('ping', { timestamp: this.pingPongConfig.lastPing });
      
      // Вызываем пользовательский обработчик
      if (this.options.onPing) {
        this.options.onPing({ timestamp: this.pingPongConfig.lastPing });
      }
    } catch (error) {
      logger.error(`❌ Error sending ping: ${error}`, 'client');
    }
  }

  /**
   * Отправка pong в ответ на ping от сервера
   */
  private sendPong(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      const pongMessage: WebSocketMessage = {
        type: 'pong',
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      };
      
      this.ws.send(JSON.stringify(pongMessage));
      logger.debug('🏓 Pong sent to server', 'client');
    } catch (error) {
      logger.error(`❌ Error sending pong: ${error}`, 'client');
    }
  }

  /**
   * Обработка pong
   */
  private handlePong(): void {
    this.pingPongConfig.lastPong = Date.now();
    
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    
    const latency = this.pingPongConfig.lastPong - this.pingPongConfig.lastPing;
    logger.debug(`🏓 Pong received, latency: ${latency}ms`, 'client');
    
    // Генерируем событие pong
    this.emit('pong', { latency, timestamp: this.pingPongConfig.lastPong });
    
    // Вызываем пользовательский обработчик
    if (this.options.onPong) {
      this.options.onPong({ latency, timestamp: this.pingPongConfig.lastPong });
    }
  }

  /**
   * Планирование переподключения
   */
  private scheduleReconnect(): void {
    if (this.reconnectConfig.currentAttempt >= this.reconnectConfig.maxAttempts) {
      logger.error(`❌ Max reconnection attempts reached (${this.reconnectConfig.maxAttempts})`, `client`);
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectConfig.currentAttempt++;
    
    const delay = this.reconnectConfig.interval * Math.pow(2, this.reconnectConfig.currentAttempt - 1);
    logger.info(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectConfig.currentAttempt}/${this.reconnectConfig.maxAttempts})`, 'client');
    
    // Генерируем событие reconnect
    this.emit('reconnect', {
      attempt: this.reconnectConfig.currentAttempt,
      maxAttempts: this.reconnectConfig.maxAttempts,
      delay,
      timestamp: Date.now()
    });
    
    // Вызываем пользовательский обработчик
    if (this.options.onReconnect) {
      this.options.onReconnect({
        attempt: this.reconnectConfig.currentAttempt,
        maxAttempts: this.reconnectConfig.maxAttempts,
        delay,
        timestamp: Date.now()
      });
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        logger.error(`❌ Reconnection failed: ${error}`, 'client');
        this.scheduleReconnect();
      });
    }, delay);
  }

  /**
   * Отмена переподключения
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isReconnecting = false;
  }

  /**
   * Обновление конфигурации
   */
  updateOptions(newOptions: Partial<WebSocketOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Обновляем конфигурацию переподключения
    if (newOptions.autoReconnect !== undefined) {
      this.reconnectConfig.enabled = newOptions.autoReconnect;
    }
    if (newOptions.reconnectAttempts !== undefined) {
      this.reconnectConfig.maxAttempts = newOptions.reconnectAttempts;
    }
    if (newOptions.reconnectDelay !== undefined) {
      this.reconnectConfig.interval = newOptions.reconnectDelay;
    }
    
    // Обновляем конфигурацию ping/pong
    if (newOptions.pingInterval !== undefined) {
      this.pingPongConfig.interval = newOptions.pingInterval;
    }
    if (newOptions.pongTimeout !== undefined) {
      this.pingPongConfig.timeout = newOptions.pongTimeout;
    }
    
    logger.info('🔧 WebSocket options updated', 'client');
  }

  /**
   * Отправка сообщения в комнату
   */
  sendToRoom(roomId: string, message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'client');
      return false;
    }

    try {
      const wsMessage: WebSocketMessage = {
        type: 'room_message',
        data: message,
        timestamp: new Date().toISOString(),
        roomId: roomId
      };

      this.ws.send(JSON.stringify(wsMessage));
      logger.debug(`📤 Room message sent to ${roomId}: ${JSON.stringify(message).substring(0, 100)}...`, 'client');
      return true;
    } catch (error) {
      logger.error(`❌ Error sending room message: ${error}`, 'client');
      return false;
    }
  }

  /**
   * Отправка прямого сообщения клиенту по ID
   */
  sendDirectMessage(clientId: string, message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error('❌ WebSocket not connected', 'client');
      return false;
    }

    try {
      const wsMessage: WebSocketMessage = {
        type: 'direct_message',
        data: message,
        timestamp: new Date().toISOString(),
        targetClientId: clientId
      };

      this.ws.send(JSON.stringify(wsMessage));
      logger.debug(`📤 Direct message sent to client ${clientId}: ${message}`, 'client');
      return true;
    } catch (error) {
      logger.error(`❌ Error sending direct message: ${error}`, 'client');
      return false;
    }
  }
}
