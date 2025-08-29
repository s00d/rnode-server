var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["TRACE"] = 0] = "TRACE";
  LogLevel2[LogLevel2["DEBUG"] = 1] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  return LogLevel2;
})(LogLevel || {});
class Logger {
  constructor(level, prefix) {
    this.level = 2;
    this.prefix = "rnode-websocket-client";
    if (level !== void 0) this.level = level;
    if (prefix !== void 0) this.prefix = prefix;
  }
  setLevel(level) {
    this.level = level;
  }
  shouldLog(level) {
    return level >= this.level;
  }
  formatMessage(level, message, context) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const contextStr = context ? ` [${context}]` : "";
    return `[${timestamp}] ${level.toUpperCase()} ${this.prefix}${contextStr}: ${message}`;
  }
  trace(message, context) {
    if (this.shouldLog(
      0
      /* TRACE */
    )) {
      console.trace(this.formatMessage("TRACE", message, context));
    }
  }
  debug(message, context) {
    if (this.shouldLog(
      1
      /* DEBUG */
    )) {
      console.debug(this.formatMessage("DEBUG", message, context));
    }
  }
  info(message, context) {
    if (this.shouldLog(
      2
      /* INFO */
    )) {
      console.info(this.formatMessage("INFO", message, context));
    }
  }
  warn(message, context) {
    if (this.shouldLog(
      3
      /* WARN */
    )) {
      console.warn(this.formatMessage("WARN", message, context));
    }
  }
  error(message, context) {
    if (this.shouldLog(
      4
      /* ERROR */
    )) {
      console.error(this.formatMessage("ERROR", message, context));
    }
  }
}
const logger = new Logger();
class RNodeWebSocketClient {
  constructor(options) {
    this.ws = null;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.pongTimer = null;
    this.isConnecting = false;
    this.isReconnecting = false;
    this.currentRoom = null;
    this.eventListeners = /* @__PURE__ */ new Map();
    this.options = {
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1e3,
      pingInterval: 3e4,
      pongTimeout: 1e4,
      ...options
    };
    this.reconnectConfig = {
      enabled: this.options.autoReconnect,
      interval: this.options.reconnectDelay,
      maxAttempts: this.options.reconnectAttempts,
      currentAttempt: 0
    };
    this.pingPongConfig = {
      enabled: true,
      interval: this.options.pingInterval,
      timeout: this.options.pongTimeout,
      lastPing: 0,
      lastPong: 0
    };
    logger.info("🔌 RNode WebSocket Client initialized", "client");
  }
  /**
   * Подписка на события
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }
  /**
   * Отписка от событий
   */
  off(event, listener) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  /**
   * Генерация событий
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          logger.error(`❌ Error in event listener for ${event}: ${error}`, "client");
        }
      });
    }
  }
  /**
   * Подключение к WebSocket серверу
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      if (this.isConnecting) {
        reject(new Error("Connection already in progress"));
        return;
      }
      this.isConnecting = true;
      let connectionUrl = this.options.url;
      if (this.options.clientId) {
        const separator = connectionUrl.includes("?") ? "&" : "?";
        connectionUrl = `${connectionUrl}${separator}clientId=${encodeURIComponent(this.options.clientId)}`;
      }
      logger.info(`🔌 Connecting to ${connectionUrl}`, "client");
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
  setupEventHandlers(resolve, reject) {
    if (!this.ws) return;
    this.ws.onopen = () => {
      this.isConnecting = false;
      this.isReconnecting = false;
      this.reconnectConfig.currentAttempt = 0;
      logger.info("✅ WebSocket connected", "client");
      this.startPingPong();
      this.emit("connect", {
        url: this.options.url,
        clientId: this.options.clientId,
        timestamp: Date.now()
      });
      if (this.options.onConnect) {
        const wsEvent = {
          type: "connect",
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
      logger.warn(`🔌 WebSocket closed: ${event.code} ${event.reason}`, "client");
      if (this.options.onDisconnect) {
        const wsEvent = {
          type: "disconnect",
          data: { code: event.code, reason: event.reason, wasClean: event.wasClean },
          timestamp: Date.now()
        };
        this.options.onDisconnect(wsEvent);
      }
      this.emit("disconnect", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        timestamp: Date.now()
      });
      if (this.reconnectConfig.enabled && !this.isReconnecting) {
        this.scheduleReconnect();
      }
    };
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        logger.debug(`📨 Message received: ${message.type}`, "client");
        if (message.type === "welcome") {
          logger.info("👋 Welcome message received", "client");
          this.emit("welcome", message);
          if (this.options.onWelcome) {
            this.options.onWelcome(message);
          }
          return;
        }
        if (message.type === "ping") {
          logger.info("🏓 Ping received from server", "client");
          this.sendPong();
          return;
        }
        if (message.type === "pong") {
          this.handlePong();
          return;
        }
        if (message.type === "room_joined") {
          logger.info("🏠 Room joined message received", "client");
          this.emit("join_room", { roomId: message.room_id, timestamp: Date.now() });
          if (this.options.onJoinRoom) {
            this.options.onJoinRoom({ roomId: message.room_id, timestamp: Date.now() });
          }
          return;
        }
        if (message.type === "room_left") {
          logger.info("🚪 Room left message received", "client");
          this.emit("leave_room", { roomId: message.room_id, timestamp: Date.now() });
          if (this.options.onLeaveRoom) {
            this.options.onLeaveRoom({ roomId: message.room_id, timestamp: Date.now() });
          }
          return;
        }
        if (message.type === "room_message") {
          logger.info("📨 Room message received", "client");
          this.emit("message", message);
          if (this.options.onRoomMessage) {
            this.options.onRoomMessage(message);
          }
          return;
        }
        if (message.type === "message_ack") {
          logger.info("✅ Message acknowledgment received", "client");
          if (this.options.onMessageAck) {
            this.options.onMessageAck(message);
          }
          return;
        }
        if (message.type === "direct_message") {
          logger.info("📨 Direct message received", "client");
          this.emit("message", message);
          if (this.options.onDirectMessage) {
            this.options.onDirectMessage(message);
          }
          return;
        }
        if (this.options.onMessage) {
          const wsEvent = {
            type: "message",
            data: message,
            timestamp: Date.now()
          };
          this.options.onMessage(wsEvent);
        }
        this.emit("message", message);
      } catch (error) {
        logger.error(`❌ Error parsing message: ${error}`, "client");
      }
    };
    this.ws.onerror = (error) => {
      this.isConnecting = false;
      logger.error(`❌ WebSocket error: ${error}`, "client");
      if (this.options.onError) {
        const wsEvent = {
          type: "error",
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
  send(data, roomId) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error("❌ WebSocket not connected", "client");
      return false;
    }
    try {
      const message = {
        type: "message",
        data,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        roomId: roomId || this.currentRoom || void 0
      };
      this.ws.send(JSON.stringify(message));
      logger.debug(`📤 Message sent: ${JSON.stringify(data).substring(0, 100)}...`, "client");
      return true;
    } catch (error) {
      logger.error(`❌ Error sending message: ${error}`, "client");
      return false;
    }
  }
  /**
   * Подключение к комнате
   */
  joinRoom(roomId) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error("❌ WebSocket not connected", "client");
      return false;
    }
    try {
      const message = {
        type: "join_room",
        data: { roomId },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.ws.send(JSON.stringify(message));
      this.currentRoom = roomId;
      logger.info(`🔗 Joined room: ${roomId}`, "client");
      this.emit("join_room", { roomId, timestamp: Date.now() });
      if (this.options.onJoinRoom) {
        this.options.onJoinRoom({ roomId, timestamp: Date.now() });
      }
      return true;
    } catch (error) {
      logger.error(`❌ Error joining room: ${error}`, "client");
      return false;
    }
  }
  /**
   * Выход из комнаты
   */
  leaveRoom(roomId) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error("❌ WebSocket not connected", "client");
      return false;
    }
    const targetRoom = roomId || this.currentRoom;
    if (!targetRoom) {
      logger.warn("⚠️ Not in any room", "client");
      return false;
    }
    try {
      const message = {
        type: "leave_room",
        data: { roomId: targetRoom },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.ws.send(JSON.stringify(message));
      if (targetRoom === this.currentRoom) {
        this.currentRoom = null;
      }
      logger.info(`🚪 Left room: ${targetRoom}`, "client");
      this.emit("leave_room", { roomId: targetRoom, timestamp: Date.now() });
      if (this.options.onLeaveRoom) {
        this.options.onLeaveRoom({ roomId: targetRoom, timestamp: Date.now() });
      }
      return true;
    } catch (error) {
      logger.error(`❌ Error leaving room: ${error}`, "client");
      return false;
    }
  }
  /**
   * Отключение от сервера
   */
  disconnect() {
    logger.info("🔌 Disconnecting from WebSocket server", "client");
    this.stopPingPong();
    this.cancelReconnect();
    if (this.ws) {
      this.ws.close(1e3, "Client disconnect");
      this.ws = null;
    }
    this.isConnecting = false;
    this.isReconnecting = false;
    this.currentRoom = null;
  }
  /**
   * Получение текущего состояния подключения
   */
  getState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
  /**
   * Проверка подключения
   */
  isConnected() {
    return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
  }
  /**
   * Получение текущей комнаты
   */
  getCurrentRoom() {
    return this.currentRoom;
  }
  /**
   * Запуск ping/pong механизма
   */
  startPingPong() {
    if (!this.pingPongConfig.enabled) return;
    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.pingPongConfig.interval);
  }
  /**
   * Остановка ping/pong механизма
   */
  stopPingPong() {
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
  sendPing() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const pingMessage = {
        type: "ping",
        data: { timestamp: (/* @__PURE__ */ new Date()).toISOString() },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.ws.send(JSON.stringify(pingMessage));
      this.pingPongConfig.lastPing = Date.now();
      this.pongTimer = setTimeout(() => {
        var _a;
        logger.warn("⚠️ Pong timeout, connection may be stale", "client");
        (_a = this.ws) == null ? void 0 : _a.close(1e3, "Pong timeout");
      }, this.pingPongConfig.timeout);
      logger.debug("🏓 Ping sent", "client");
      this.emit("ping", { timestamp: this.pingPongConfig.lastPing });
      if (this.options.onPing) {
        this.options.onPing({ timestamp: this.pingPongConfig.lastPing });
      }
    } catch (error) {
      logger.error(`❌ Error sending ping: ${error}`, "client");
    }
  }
  /**
   * Отправка pong в ответ на ping от сервера
   */
  sendPong() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      const pongMessage = {
        type: "pong",
        data: { timestamp: (/* @__PURE__ */ new Date()).toISOString() },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.ws.send(JSON.stringify(pongMessage));
      logger.debug("🏓 Pong sent to server", "client");
    } catch (error) {
      logger.error(`❌ Error sending pong: ${error}`, "client");
    }
  }
  /**
   * Обработка pong
   */
  handlePong() {
    this.pingPongConfig.lastPong = Date.now();
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    const latency = this.pingPongConfig.lastPong - this.pingPongConfig.lastPing;
    logger.debug(`🏓 Pong received, latency: ${latency}ms`, "client");
    this.emit("pong", { latency, timestamp: this.pingPongConfig.lastPong });
    if (this.options.onPong) {
      this.options.onPong({ latency, timestamp: this.pingPongConfig.lastPong });
    }
  }
  /**
   * Планирование переподключения
   */
  scheduleReconnect() {
    if (this.reconnectConfig.currentAttempt >= this.reconnectConfig.maxAttempts) {
      logger.error(`❌ Max reconnection attempts reached (${this.reconnectConfig.maxAttempts})`, `client`);
      return;
    }
    this.isReconnecting = true;
    this.reconnectConfig.currentAttempt++;
    const delay = this.reconnectConfig.interval * Math.pow(2, this.reconnectConfig.currentAttempt - 1);
    logger.info(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectConfig.currentAttempt}/${this.reconnectConfig.maxAttempts})`, "client");
    this.emit("reconnect", {
      attempt: this.reconnectConfig.currentAttempt,
      maxAttempts: this.reconnectConfig.maxAttempts,
      delay,
      timestamp: Date.now()
    });
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
        logger.error(`❌ Reconnection failed: ${error}`, "client");
        this.scheduleReconnect();
      });
    }, delay);
  }
  /**
   * Отмена переподключения
   */
  cancelReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isReconnecting = false;
  }
  /**
   * Обновление конфигурации
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
    if (newOptions.autoReconnect !== void 0) {
      this.reconnectConfig.enabled = newOptions.autoReconnect;
    }
    if (newOptions.reconnectAttempts !== void 0) {
      this.reconnectConfig.maxAttempts = newOptions.reconnectAttempts;
    }
    if (newOptions.reconnectDelay !== void 0) {
      this.reconnectConfig.interval = newOptions.reconnectDelay;
    }
    if (newOptions.pingInterval !== void 0) {
      this.pingPongConfig.interval = newOptions.pingInterval;
    }
    if (newOptions.pongTimeout !== void 0) {
      this.pingPongConfig.timeout = newOptions.pongTimeout;
    }
    logger.info("🔧 WebSocket options updated", "client");
  }
  /**
   * Отправка сообщения в комнату
   */
  sendToRoom(roomId, message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error("❌ WebSocket not connected", "client");
      return false;
    }
    try {
      const wsMessage = {
        type: "room_message",
        data: message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        roomId
      };
      this.ws.send(JSON.stringify(wsMessage));
      logger.debug(`📤 Room message sent to ${roomId}: ${JSON.stringify(message).substring(0, 100)}...`, "client");
      return true;
    } catch (error) {
      logger.error(`❌ Error sending room message: ${error}`, "client");
      return false;
    }
  }
  /**
   * Отправка прямого сообщения клиенту по ID
   */
  sendDirectMessage(clientId, message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error("❌ WebSocket not connected", "client");
      return false;
    }
    try {
      const wsMessage = {
        type: "direct_message",
        data: message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        targetClientId: clientId
      };
      this.ws.send(JSON.stringify(wsMessage));
      logger.debug(`📤 Direct message sent to client ${clientId}: ${message}`, "client");
      return true;
    } catch (error) {
      logger.error(`❌ Error sending direct message: ${error}`, "client");
      return false;
    }
  }
}
function createWebSocketClient(options) {
  return new RNodeWebSocketClient(options);
}
const WebSocketUtils = {
  /**
   * Проверка поддержки WebSocket в браузере
   */
  isSupported() {
    return typeof WebSocket !== "undefined";
  },
  /**
   * Получение состояния подключения в текстовом виде
   */
  getStateString(state) {
    switch (state) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "UNKNOWN";
    }
  },
  /**
   * Создание уникального ID для клиента
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  /**
   * Валидация URL WebSocket
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "ws:" || urlObj.protocol === "wss:";
    } catch {
      return false;
    }
  }
};
if (typeof window !== "undefined") {
  window.RNodeWebSocketClient = RNodeWebSocketClient;
  window.createWebSocketClient = createWebSocketClient;
  window.WebSocketUtils = WebSocketUtils;
  window.WebSocketLogger = Logger;
  window.WebSocketLogLevel = LogLevel;
  console.log("🔌 RNode WebSocket Client глобально доступен на странице");
  console.log("📖 Доступные глобальные объекты:");
  console.log("   - window.RNodeWebSocketClient:", typeof window.RNodeWebSocketClient);
  console.log("   - window.createWebSocketClient():", typeof window.createWebSocketClient);
  console.log("   - window.WebSocketUtils:", typeof window.WebSocketUtils);
  console.log("   - window.WebSocketLogger:", typeof window.WebSocketLogger);
  try {
    const testClient = new window.RNodeWebSocketClient({ url: "ws://test" });
    console.log("✅ RNodeWebSocketClient успешно создан как конструктор");
  } catch (error) {
    console.error("❌ RNodeWebSocketClient не является конструктором:", error);
  }
}
export {
  LogLevel,
  Logger,
  RNodeWebSocketClient,
  WebSocketUtils,
  createWebSocketClient
};
//# sourceMappingURL=rnode-websocket-client.es.js.map
