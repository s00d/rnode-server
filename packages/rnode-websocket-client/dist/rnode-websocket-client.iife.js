(function(exports) {
  "use strict";
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
  class EventEmitter {
    constructor() {
      this.eventListeners = /* @__PURE__ */ new Map();
    }
    /**
     * Subscribe to events
     */
    on(event, listener) {
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(listener);
    }
    /**
     * Unsubscribe from events
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
     * Emit events
     */
    emit(event, data) {
      if (this.eventListeners.has(event)) {
        const listeners = this.eventListeners.get(event);
        listeners.forEach((listener) => {
          try {
            listener(data);
          } catch (error) {
            logger.error(`❌ Error in event listener for ${event}: ${error}`, "events");
          }
        });
      }
    }
    /**
     * Clear all event listeners
     */
    removeAllListeners(event) {
      if (event) {
        this.eventListeners.delete(event);
      } else {
        this.eventListeners.clear();
      }
    }
    /**
     * Get number of listeners for event
     */
    listenerCount(event) {
      var _a;
      return ((_a = this.eventListeners.get(event)) == null ? void 0 : _a.length) || 0;
    }
    /**
     * Get list of all events
     */
    eventNames() {
      return Array.from(this.eventListeners.keys());
    }
  }
  var ConnectionState = ((ConnectionState2) => {
    ConnectionState2[ConnectionState2["CONNECTING"] = WebSocket.CONNECTING] = "CONNECTING";
    ConnectionState2[ConnectionState2["OPEN"] = WebSocket.OPEN] = "OPEN";
    ConnectionState2[ConnectionState2["CLOSING"] = WebSocket.CLOSING] = "CLOSING";
    ConnectionState2[ConnectionState2["CLOSED"] = WebSocket.CLOSED] = "CLOSED";
    return ConnectionState2;
  })(ConnectionState || {});
  class ConnectionManager {
    constructor(options) {
      this.ws = null;
      this.isConnecting = false;
      this.currentRoom = null;
      this.options = options;
    }
    /**
     * Set disconnect handler
     */
    setDisconnectCallback(callback) {
      this.onDisconnectCallback = callback;
    }
    /**
     * Connect to WebSocket server
     */
    async connect() {
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
        logger.info(`🔌 Connecting to ${connectionUrl}`, "connection");
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
    setupEventHandlers(resolve, _reject) {
      if (!this.ws) return;
      this.ws.onopen = () => {
        this.isConnecting = false;
        logger.info("✅ WebSocket connected", "connection");
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
        logger.warn(`🔌 WebSocket closed: ${event.code} ${event.reason}`, "connection");
        if (this.options.onDisconnect) {
          const wsEvent = {
            type: "disconnect",
            data: { code: event.code, reason: event.reason, wasClean: event.wasClean },
            timestamp: Date.now()
          };
          this.options.onDisconnect(wsEvent);
        }
        if (this.onDisconnectCallback) {
          this.onDisconnectCallback();
        }
      };
      this.ws.onerror = (error) => {
        this.isConnecting = false;
        logger.error(`❌ WebSocket error: ${error}`, "connection");
        if (this.options.onError) {
          const wsEvent = {
            type: "error",
            data: { error: error.toString() },
            timestamp: Date.now()
          };
          this.options.onError(wsEvent);
        }
      };
      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          logger.debug(`📦 Binary message received: ${event.data instanceof ArrayBuffer ? event.data.byteLength : "blob"} bytes`, "connection");
          if (this.options.onBinaryMessage) {
            const wsEvent = {
              type: "binary_message",
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
    disconnect() {
      logger.info("🔌 Disconnecting from WebSocket server", "connection");
      if (this.ws) {
        this.ws.close(1e3, "Client disconnect");
        this.ws = null;
      }
      this.isConnecting = false;
      this.currentRoom = null;
    }
    /**
     * Get WebSocket connection
     */
    getWebSocket() {
      return this.ws;
    }
    /**
     * Get current connection state
     */
    getState() {
      return this.ws ? this.ws.readyState : ConnectionState.CLOSED;
    }
    /**
     * Check connection
     */
    isConnected() {
      return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
    }
    /**
     * Get connection status
     */
    getConnectionStatus() {
      return {
        isConnected: this.isConnected(),
        isConnecting: this.isConnecting,
        isReconnecting: false,
        // Managed by ReconnectionManager
        currentRoom: this.currentRoom,
        state: this.getState()
      };
    }
    /**
     * Set current room
     */
    setCurrentRoom(roomId) {
      this.currentRoom = roomId;
    }
    /**
     * Get current room
     */
    getCurrentRoom() {
      return this.currentRoom;
    }
  }
  class RoomManager {
    constructor(connectionManager, options) {
      this.connectionManager = connectionManager;
      this.options = options;
    }
    /**
     * Join room
     */
    joinRoom(roomId) {
      const ws = this.connectionManager.getWebSocket();
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        logger.error("❌ WebSocket not connected", "rooms");
        return false;
      }
      try {
        const message = {
          type: "join_room",
          room_id: roomId,
          // Use snake_case in root object
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        ws.send(JSON.stringify(message));
        this.connectionManager.setCurrentRoom(roomId);
        logger.info(`🔗 Joined room: ${roomId}`, "rooms");
        if (this.options.onJoinRoom) {
          const roomEvent = { roomId, timestamp: Date.now() };
          this.options.onJoinRoom(roomEvent);
        }
        return true;
      } catch (error) {
        logger.error(`❌ Error joining room: ${error}`, "rooms");
        return false;
      }
    }
    /**
     * Leave room
     */
    leaveRoom(roomId) {
      const ws = this.connectionManager.getWebSocket();
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        logger.error("❌ WebSocket not connected", "rooms");
        return false;
      }
      const targetRoom = roomId || this.connectionManager.getCurrentRoom();
      if (!targetRoom) {
        logger.warn("⚠️ Not in any room", "rooms");
        return false;
      }
      try {
        const message = {
          type: "leave_room",
          room_id: targetRoom,
          // Use snake_case in root object
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        ws.send(JSON.stringify(message));
        if (targetRoom === this.connectionManager.getCurrentRoom()) {
          this.connectionManager.setCurrentRoom(null);
        }
        logger.info(`🚪 Left room: ${targetRoom}`, "rooms");
        if (this.options.onLeaveRoom) {
          const roomEvent = { roomId: targetRoom, timestamp: Date.now() };
          this.options.onLeaveRoom(roomEvent);
        }
        return true;
      } catch (error) {
        logger.error(`❌ Error leaving room: ${error}`, "rooms");
        return false;
      }
    }
    /**
     * Get current room
     */
    getCurrentRoom() {
      return this.connectionManager.getCurrentRoom();
    }
    /**
     * Check if in room
     */
    isInRoom(roomId) {
      const currentRoom = this.connectionManager.getCurrentRoom();
      return roomId ? currentRoom === roomId : currentRoom !== null;
    }
  }
  class MessageManager extends EventEmitter {
    constructor(connectionManager, options, pingPongManager) {
      super();
      this.connectionManager = connectionManager;
      this.options = options;
      this.pingPongManager = pingPongManager;
    }
    /**
     * Setup message handler
     */
    setupMessageHandler() {
      const ws = this.connectionManager.getWebSocket();
      if (!ws) {
        logger.error("❌ WebSocket not available for message handler", "messages");
        return;
      }
      ws.onmessage = (event) => {
        try {
          logger.debug(`📨 Raw message received: ${event.data}`, "messages");
          const message = JSON.parse(event.data);
          logger.debug(`📨 Message parsed: ${message.type}`, "messages");
          this.handleMessage(message);
        } catch (error) {
          logger.error(`❌ Error parsing message: ${error}`, "messages");
        }
      };
    }
    /**
     * Public method to setup message handler after connection
     */
    setupMessageHandlerAfterConnect() {
      logger.info("🔧 Setting up message handler after connection", "messages");
      this.setupMessageHandler();
    }
    /**
     * Handle incoming messages
     */
    handleMessage(message) {
      logger.debug(`🔍 Handling message type: ${message.type}`, "messages");
      switch (message.type) {
        case "welcome":
          logger.debug("🎯 Welcome case matched", "messages");
          this.handleWelcome(message);
          break;
        case "ping":
          this.handlePing(message);
          break;
        case "pong":
          this.handlePong(message);
          break;
        case "room_joined":
          this.handleRoomJoined(message);
          break;
        case "room_left":
          this.handleRoomLeft(message);
          break;
        case "room_message":
          this.handleRoomMessage(message);
          break;
        case "message_ack":
          logger.debug("✅ Message ack case matched", "messages");
          this.handleMessageAck(message);
          break;
        case "direct_message":
          this.handleDirectMessage(message);
          break;
        case "error":
          this.handleServerError(message);
          break;
        default:
          this.handleGenericMessage(message);
          break;
      }
    }
    /**
     * Handle welcome message
     */
    handleWelcome(message) {
      logger.info("👋 Welcome message received", "messages");
      logger.debug(`👋 Welcome message data: ${JSON.stringify(message)}`, "messages");
      this.emit("welcome", message);
      if (this.options.onWelcome) {
        logger.info("👋 Calling onWelcome callback", "messages");
        this.options.onWelcome(message);
      } else {
        logger.warn("⚠️ onWelcome callback not set", "messages");
      }
    }
    /**
     * Handle ping message
     */
    handlePing(message) {
      logger.info("🏓 Ping received from server", "messages");
      if (this.pingPongManager) {
        this.pingPongManager.handlePingFromServer();
      }
      this.emit("ping", message);
    }
    /**
     * Handle pong message
     */
    handlePong(message) {
      if (this.pingPongManager) {
        this.pingPongManager.handlePongFromServer();
      }
      this.emit("pong", message);
    }
    /**
     * Handle room joined message
     */
    handleRoomJoined(message) {
      logger.info("🏠 Room joined message received", "messages");
      const roomEvent = { roomId: message.room_id, timestamp: Date.now() };
      this.emit("join_room", roomEvent);
      if (this.options.onJoinRoom) {
        this.options.onJoinRoom(roomEvent);
      }
    }
    /**
     * Handle room left message
     */
    handleRoomLeft(message) {
      logger.info("🚪 Room left message received", "messages");
      const roomEvent = { roomId: message.room_id, timestamp: Date.now() };
      this.emit("leave_room", roomEvent);
      if (this.options.onLeaveRoom) {
        this.options.onLeaveRoom(roomEvent);
      }
    }
    /**
     * Handle room message
     */
    handleRoomMessage(message) {
      logger.info("📨 Room message received", "messages");
      this.emit("room_message", message);
      if (this.options.onRoomMessage) {
        this.options.onRoomMessage(message);
      }
    }
    /**
     * Handle message acknowledgment
     */
    handleMessageAck(message) {
      logger.info("✅ Message acknowledgment received", "messages");
      logger.debug(`✅ Message ack data: ${JSON.stringify(message)}`, "messages");
      if (message.message && typeof message.message === "string") {
        logger.debug(`🔍 Checking message: ${message.message}`, "messages");
        try {
          const ackedMessage = JSON.parse(message.message);
          logger.debug(`🔍 Parsed acked message: ${JSON.stringify(ackedMessage)}`, "messages");
          if (ackedMessage.type === "pong") {
            logger.debug("🏓 Pong acknowledgment received", "messages");
            if (this.pingPongManager) {
              logger.debug("🏓 Calling handlePongFromServer", "messages");
              this.pingPongManager.handlePongFromServer();
            } else {
              logger.warn("⚠️ PingPongManager not available", "messages");
            }
          } else {
            logger.debug(`✅ Regular message ack for type: ${ackedMessage.type}`, "messages");
          }
        } catch (error) {
          logger.debug(`❌ Error parsing acked message: ${error}`, "messages");
        }
      } else {
        logger.debug("✅ Message ack without message field", "messages");
      }
      this.emit("message_ack", message);
      if (this.options.onMessageAck) {
        this.options.onMessageAck(message);
      }
    }
    /**
     * Handle direct message
     */
    handleDirectMessage(message) {
      logger.info("📨 Direct message received", "messages");
      this.emit("direct_message", message);
      if (this.options.onDirectMessage) {
        this.options.onDirectMessage(message);
      }
    }
    /**
     * Handle server error
     */
    handleServerError(message) {
      logger.error(`❌ Server error: ${message.error} (${message.error_type})`, "messages");
      this.emit("error", message);
      if (this.options.onServerError) {
        this.options.onServerError(message);
      }
    }
    /**
     * Handle generic message
     */
    handleGenericMessage(message) {
      if (this.options.onMessage) {
        const wsEvent = {
          type: "message",
          data: message,
          timestamp: Date.now()
        };
        this.options.onMessage(wsEvent);
      }
      this.emit("message", message);
    }
    /**
     * Send message
     */
    send(data, roomId) {
      const ws = this.connectionManager.getWebSocket();
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        logger.error("❌ WebSocket not connected", "messages");
        return false;
      }
      try {
        const message = {
          type: "message",
          data,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          room_id: roomId || this.connectionManager.getCurrentRoom() || null
          // snake_case
        };
        ws.send(JSON.stringify(message));
        logger.debug(`📤 Message sent: ${JSON.stringify(data).substring(0, 100)}...`, "messages");
        return true;
      } catch (error) {
        logger.error(`❌ Error sending message: ${error}`, "messages");
        return false;
      }
    }
    /**
     * Send message to room
     */
    sendToRoom(roomId, message) {
      const ws = this.connectionManager.getWebSocket();
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        logger.error("❌ WebSocket not connected", "messages");
        return false;
      }
      try {
        const wsMessage = {
          type: "room_message",
          data: message,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          room_id: roomId
          // Use snake_case for server compatibility
        };
        ws.send(JSON.stringify(wsMessage));
        logger.debug(`📤 Room message sent to ${roomId}: ${JSON.stringify(message).substring(0, 100)}...`, "messages");
        return true;
      } catch (error) {
        logger.error(`❌ Error sending room message: ${error}`, "messages");
        return false;
      }
    }
    /**
     * Send direct message to client by ID
     */
    sendDirectMessage(clientId, message) {
      const ws = this.connectionManager.getWebSocket();
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        logger.error("❌ WebSocket not connected", "messages");
        return false;
      }
      try {
        const wsMessage = {
          type: "direct_message",
          data: message,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          target_client_id: clientId
          // Use snake_case for server compatibility
        };
        ws.send(JSON.stringify(wsMessage));
        logger.debug(`📤 Direct message sent to client ${clientId}: ${message}`, "messages");
        return true;
      } catch (error) {
        logger.error(`❌ Error sending direct message: ${error}`, "messages");
        return false;
      }
    }
  }
  class PingPongManager extends EventEmitter {
    constructor(connectionManager, options) {
      super();
      this.pongTimer = null;
      this.lastPing = 0;
      this.lastPong = 0;
      this.pongTimeoutId = null;
      this.connectionManager = connectionManager;
      this.options = options;
    }
    /**
     * Start ping/pong mechanism (client only responds to server ping)
     */
    start() {
      logger.debug("🏓 Ping/pong mechanism started (client responds to server pings)", "pingpong");
    }
    /**
     * Stop ping/pong mechanism
     */
    stop() {
      if (this.pongTimer) {
        clearTimeout(this.pongTimer);
        this.pongTimer = null;
      }
      if (this.pongTimeoutId) {
        clearTimeout(this.pongTimeoutId);
        this.pongTimeoutId = null;
      }
      logger.debug("🏓 Ping/pong mechanism stopped", "pingpong");
    }
    /**
     * Handle ping from server (client only responds)
     */
    handlePingFromServer() {
      this.lastPing = Date.now();
      this.sendPong();
      if (this.options.pongTimeout) {
        this.pongTimeoutId = setTimeout(() => {
          logger.warn("⚠️ No ping received from server, connection may be stale", "pingpong");
          const ws = this.connectionManager.getWebSocket();
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close(1e3, "No ping from server");
          }
        }, this.options.pongTimeout);
      }
      logger.debug("🏓 Ping received from server, pong sent", "pingpong");
      const pingEvent = { timestamp: this.lastPing };
      this.emit("ping", pingEvent);
      if (this.options.onPing) {
        this.options.onPing(pingEvent);
      }
    }
    /**
     * Send pong in response to ping from server
     */
    sendPong() {
      const ws = this.connectionManager.getWebSocket();
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      try {
        const pongMessage = {
          type: "pong",
          data: { timestamp: (/* @__PURE__ */ new Date()).toISOString() },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        ws.send(JSON.stringify(pongMessage));
        logger.debug("🏓 Pong sent to server", "pingpong");
      } catch (error) {
        logger.error(`❌ Error sending pong: ${error}`, "pingpong");
      }
    }
    /**
     * Handle pong from server (for confirmation)
     */
    handlePongFromServer() {
      this.lastPong = Date.now();
      if (this.pongTimeoutId) {
        clearTimeout(this.pongTimeoutId);
        this.pongTimeoutId = null;
      }
      const latency = this.lastPong - this.lastPing;
      logger.debug(`🏓 Pong received from server, latency: ${latency}ms`, "pingpong");
      const pongEvent = { latency, timestamp: this.lastPong };
      this.emit("pong", pongEvent);
      if (this.options.onPong) {
        this.options.onPong(pongEvent);
      }
    }
    /**
     * Get last ping
     */
    getLastPing() {
      return this.lastPing;
    }
    /**
     * Get last pong
     */
    getLastPong() {
      return this.lastPong;
    }
    /**
     * Get current latency
     */
    getLatency() {
      if (this.lastPing === 0 || this.lastPong === 0) return 0;
      return this.lastPong - this.lastPing;
    }
    /**
     * Check ping/pong activity
     */
    isActive() {
      return this.pongTimeoutId !== null;
    }
  }
  class ReconnectionManager extends EventEmitter {
    // Save rooms for restoration
    constructor(connectionManager, options, roomManager) {
      super();
      this.reconnectTimer = null;
      this.isReconnecting = false;
      this.currentAttempt = 0;
      this.previousRooms = [];
      this.connectionManager = connectionManager;
      this.roomManager = roomManager || new RoomManager(connectionManager, options);
      this.options = options;
    }
    /**
     * Save current rooms before reconnection
     */
    saveCurrentRooms() {
      const currentRoom = this.roomManager.getCurrentRoom();
      if (currentRoom) {
        this.previousRooms = [currentRoom];
        logger.debug(`💾 Saved room for reconnection: ${currentRoom}`, "reconnection");
      }
    }
    /**
     * Restore rooms after reconnection
     */
    async restoreRooms() {
      if (this.previousRooms.length > 0) {
        logger.debug(`🔄 Restoring ${this.previousRooms.length} rooms after reconnection`, "reconnection");
        for (const roomId of this.previousRooms) {
          try {
            await this.roomManager.joinRoom(roomId);
            logger.debug(`✅ Restored room: ${roomId}`, "reconnection");
          } catch (error) {
            logger.error(`❌ Failed to restore room ${roomId}: ${error}`, "reconnection");
          }
        }
      }
    }
    /**
     * Schedule reconnection
     */
    scheduleReconnect() {
      if (!this.options.autoReconnect) return;
      if (this.currentAttempt >= (this.options.reconnectAttempts || 5)) {
        logger.error(`❌ Max reconnection attempts reached (${this.options.reconnectAttempts})`, "reconnection");
        return;
      }
      this.isReconnecting = true;
      this.currentAttempt++;
      this.saveCurrentRooms();
      const delay = (this.options.reconnectDelay || 1e3) * Math.pow(2, this.currentAttempt - 1);
      logger.info(`🔄 Reconnecting in ${delay}ms (attempt ${this.currentAttempt}/${this.options.reconnectAttempts})`, "reconnection");
      const reconnectEvent = {
        attempt: this.currentAttempt,
        maxAttempts: this.options.reconnectAttempts || 5,
        delay,
        timestamp: Date.now()
      };
      this.emit("reconnect", reconnectEvent);
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
    async performReconnect() {
      try {
        await this.connectionManager.connect();
        await this.restoreRooms();
        this.resetReconnection();
      } catch (error) {
        logger.error(`❌ Reconnection failed: ${error}`, "reconnection");
        this.scheduleReconnect();
      }
    }
    /**
     * Reset reconnection state
     */
    resetReconnection() {
      this.isReconnecting = false;
      this.currentAttempt = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      logger.info("✅ Reconnection successful", "reconnection");
    }
    /**
     * Cancel reconnection
     */
    cancelReconnect() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.isReconnecting = false;
      this.currentAttempt = 0;
      logger.debug("🛑 Reconnection cancelled", "reconnection");
    }
    /**
     * Check reconnection state
     */
    getIsReconnecting() {
      return this.isReconnecting;
    }
    /**
     * Get current attempt
     */
    getCurrentAttempt() {
      return this.currentAttempt;
    }
    /**
     * Get maximum attempts
     */
    getMaxAttempts() {
      return this.options.reconnectAttempts || 5;
    }
    /**
     * Update reconnection configuration
     */
    updateConfig(newOptions) {
      this.options = { ...this.options, ...newOptions };
    }
  }
  class RNodeWebSocketClient extends EventEmitter {
    constructor(options) {
      super();
      this.options = {
        autoReconnect: true,
        reconnectAttempts: 5,
        reconnectDelay: 1e3,
        pingInterval: 3e4,
        pongTimeout: 1e4,
        ...options
      };
      this.connectionManager = new ConnectionManager(this.options);
      this.roomManager = new RoomManager(this.connectionManager, this.options);
      this.pingPongManager = new PingPongManager(this.connectionManager, this.options);
      this.messageManager = new MessageManager(this.connectionManager, this.options, this.pingPongManager);
      this.reconnectionManager = new ReconnectionManager(this.connectionManager, this.options, this.roomManager);
      this.setupEventHandlers();
      this.connectionManager.setDisconnectCallback(() => {
        if (this.options.autoReconnect) {
          this.reconnectionManager.scheduleReconnect();
        }
      });
      logger.info("🔌 RNode WebSocket Client initialized", "client");
    }
    /**
     * Setup event handlers from managers
     */
    setupEventHandlers() {
      this.messageManager.on("welcome", (data) => this.emit("welcome", data));
      this.messageManager.on("ping", (data) => this.emit("ping", data));
      this.messageManager.on("pong", (data) => this.emit("pong", data));
      this.messageManager.on("join_room", (data) => this.emit("join_room", data));
      this.messageManager.on("leave_room", (data) => this.emit("leave_room", data));
      this.messageManager.on("message", (data) => this.emit("message", data));
      this.messageManager.on("direct_message", (data) => this.emit("direct_message", data));
      this.messageManager.on("room_message", (data) => this.emit("room_message", data));
      this.messageManager.on("message_ack", (data) => this.emit("message_ack", data));
      this.messageManager.on("error", (data) => this.emit("error", data));
      this.reconnectionManager.on("reconnect", (data) => this.emit("reconnect", data));
      this.pingPongManager.on("ping", (data) => this.emit("ping", data));
      this.pingPongManager.on("pong", (data) => this.emit("pong", data));
    }
    /**
     * Connect to WebSocket server
     */
    async connect() {
      await this.connectionManager.connect();
      this.messageManager.setupMessageHandlerAfterConnect();
      this.pingPongManager.start();
      this.emit("connect", {
        url: this.options.url,
        clientId: this.options.clientId,
        timestamp: Date.now()
      });
    }
    /**
     * Disconnect from server
     */
    disconnect() {
      logger.info("🔌 Disconnecting from WebSocket server", "client");
      this.pingPongManager.stop();
      this.reconnectionManager.cancelReconnect();
      this.connectionManager.disconnect();
    }
    /**
     * Send message
     */
    send(data, roomId) {
      return this.messageManager.send(data, roomId);
    }
    /**
     * Send message to room
     */
    sendToRoom(roomId, message) {
      return this.messageManager.sendToRoom(roomId, message);
    }
    /**
     * Send direct message to client by ID
     */
    sendDirectMessage(clientId, message) {
      return this.messageManager.sendDirectMessage(clientId, message);
    }
    /**
     * Join room
     */
    joinRoom(roomId) {
      return this.roomManager.joinRoom(roomId);
    }
    /**
     * Leave room
     */
    leaveRoom(roomId) {
      return this.roomManager.leaveRoom(roomId);
    }
    /**
     * Get current connection state
     */
    getState() {
      return this.connectionManager.getState();
    }
    /**
     * Check connection
     */
    isConnected() {
      return this.connectionManager.isConnected();
    }
    /**
     * Get current room
     */
    getCurrentRoom() {
      return this.roomManager.getCurrentRoom();
    }
    /**
     * Get connection status
     */
    getConnectionStatus() {
      const status = this.connectionManager.getConnectionStatus();
      return {
        ...status,
        isReconnecting: this.reconnectionManager.getIsReconnecting()
      };
    }
    /**
     * Get ping/pong latency
     */
    getLatency() {
      return this.pingPongManager.getLatency();
    }
    /**
     * Update configuration
     */
    updateOptions(newOptions) {
      this.options = { ...this.options, ...newOptions };
      this.reconnectionManager.updateConfig(newOptions);
      if (newOptions.pingInterval !== void 0) {
        this.pingPongManager.stop();
        this.pingPongManager.start();
      }
      logger.info("🔧 WebSocket options updated", "client");
    }
    /**
     * Get statistics
     */
    getStats() {
      return {
        connection: this.getConnectionStatus(),
        latency: this.getLatency(),
        reconnectionAttempts: this.reconnectionManager.getCurrentAttempt(),
        maxReconnectionAttempts: this.reconnectionManager.getMaxAttempts()
      };
    }
  }
  class WebSocketUtils {
    /**
    * Check WebSocket support in browser
    */
    static isSupported() {
      return typeof WebSocket !== "undefined";
    }
    /**
     * Get connection state as text
     */
    static getStateString(state) {
      switch (state) {
        case ConnectionState.CONNECTING:
          return "CONNECTING";
        case ConnectionState.OPEN:
          return "OPEN";
        case ConnectionState.CLOSING:
          return "CLOSING";
        case ConnectionState.CLOSED:
          return "CLOSED";
        default:
          return "UNKNOWN";
      }
    }
    /**
     * Create unique client ID
     */
    static generateClientId() {
      return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Validate WebSocket URL
     */
    static isValidUrl(url) {
      try {
        const urlObj = new URL(url);
        return urlObj.protocol === "ws:" || urlObj.protocol === "wss:";
      } catch {
        return false;
      }
    }
    /**
     * Create URL with parameters
     */
    static buildUrl(baseUrl, params) {
      const url = new URL(baseUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      return url.toString();
    }
    /**
     * Format time
     */
    static formatTimestamp(timestamp) {
      return new Date(timestamp).toISOString();
    }
    /**
     * Check JSON validity
     */
    static isValidJSON(str) {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    }
    /**
     * Safe JSON parsing
     */
    static safeJSONParse(str, fallback) {
      try {
        return JSON.parse(str);
      } catch {
        return fallback;
      }
    }
    /**
     * Generate random ID
     */
    static generateId() {
      return Math.random().toString(36).substr(2, 9);
    }
    /**
     * Check message type
     */
    static isSystemMessage(type) {
      const systemTypes = ["ping", "pong", "welcome", "room_joined", "room_left", "message_ack"];
      return systemTypes.includes(type);
    }
    /**
     * Check room type
     */
    static isRoomMessage(type) {
      return type === "room_message" || type === "join_room" || type === "leave_room";
    }
    /**
     * Check direct message type
     */
    static isDirectMessage(type) {
      return type === "direct_message";
    }
  }
  function createWebSocketClient(options) {
    return new RNodeWebSocketClient(options);
  }
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
  }
  exports.ConnectionManager = ConnectionManager;
  exports.ConnectionState = ConnectionState;
  exports.EventEmitter = EventEmitter;
  exports.LogLevel = LogLevel;
  exports.Logger = Logger;
  exports.MessageManager = MessageManager;
  exports.PingPongManager = PingPongManager;
  exports.RNodeWebSocketClient = RNodeWebSocketClient;
  exports.ReconnectionManager = ReconnectionManager;
  exports.RoomManager = RoomManager;
  exports.WebSocketUtils = WebSocketUtils;
  exports.createWebSocketClient = createWebSocketClient;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
})(this.RNodeWebSocketClient = this.RNodeWebSocketClient || {});
//# sourceMappingURL=rnode-websocket-client.iife.js.map
