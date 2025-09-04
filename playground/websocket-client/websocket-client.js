// WebSocket Client Demo
class WebSocketClientDemo {
    constructor() {
        this.client = null;
        this.currentRoom = null;
        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            ping: 0
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadRooms();
        
        console.log('🔌 WebSocket Client Demo initialized');
    }

    initializeElements() {
        // Получаем элементы DOM
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            serverUrl: document.getElementById('serverUrl'),
            clientId: document.getElementById('clientId'),
            connectBtn: document.getElementById('connectBtn'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            roomId: document.getElementById('roomId'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            messageText: document.getElementById('messageText'),
            targetRoom: document.getElementById('targetRoom'),
            sendMessageBtn: document.getElementById('sendMessageBtn'),
            sendToRoomBtn: document.getElementById('sendToRoomBtn'),
            targetClientId: document.getElementById('targetClientId'),
            directMessageText: document.getElementById('directMessageText'),
            sendDirectMessageBtn: document.getElementById('sendDirectMessageBtn'),
            roomsList: document.getElementById('roomsList'),
            pingValue: document.getElementById('pingValue'),
            messagesSent: document.getElementById('messagesSent'),
            messagesReceived: document.getElementById('messagesReceived'),
            currentRoom: document.getElementById('currentRoom'),
            refreshMetricsBtn: document.getElementById('refreshMetricsBtn'),
            eventLog: document.getElementById('eventLog'),
            clearLogBtn: document.getElementById('clearLogBtn'),
            exportLogBtn: document.getElementById('exportLogBtn')
        };

        // Генерируем Client ID если доступны глобальные утилиты
        if (window.WebSocketUtils && window.WebSocketUtils.generateClientId) {
            this.elements.clientId.value = window.WebSocketUtils.generateClientId();
        } else {
            this.elements.clientId.value = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    bindEvents() {
        // Подключение/отключение
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // Работа с комнатами
        this.elements.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        
        // Отправка сообщений
        this.elements.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        this.elements.sendToRoomBtn.addEventListener('click', () => this.sendToRoom());
        this.elements.sendDirectMessageBtn.addEventListener('click', () => this.sendDirectMessage());
        
        // Метрики
        this.elements.refreshMetricsBtn.addEventListener('click', () => this.refreshMetrics());
        
        // Лог
        this.elements.clearLogBtn.addEventListener('click', () => this.clearLog());
        this.elements.exportLogBtn.addEventListener('click', () => this.exportLog());
    }

    async connect() {
        const url = this.elements.serverUrl.value;
        const clientId = this.elements.clientId.value;

        if (!url) {
            this.log('❌ URL cannot be empty', 'error');
            return;
        }

        try {
            if (!window.RNodeWebSocketClient) {
                this.log('❌ RNodeWebSocketClient not available', 'error');
                return;
            }

            console.log('🔌 Подключение к', url);
            this.client = new window.RNodeWebSocketClient({
                url,
                clientId,
                autoReconnect: true,
                reconnectAttempts: 5,
                reconnectDelay: 1000,
                pingInterval: 30000,
                pongTimeout: 10000,
                onMessageBlocked: (data) => {
                console.log('🚫 Message was blocked:', data);
                console.log('   Original message:', data.originalMessage);
                console.log('   Reason:', data.reason);
                console.log('   Blocked at:', data.timestamp);
                },
                onConnect: (data) => {
                    this.log('✅ WebSocket connected', 'success');
                    this.updateConnectionStatus('connected');
                    this.log(`🔗 Connected to ${data.data.url}`, 'info');
                    
                    // Активируем кнопки после подключения
                    this.enableControls();
                    
                    // Если переподключение и была активная комната, переподписываемся
                    if (this.currentRoom && this.client.isConnected()) {
                        this.log(`🔄 Auto-resubscribe to room: ${this.currentRoom}`, 'info');
                        setTimeout(() => {
                            this.client.joinRoom(this.currentRoom);
                        }, 500); // Небольшая задержка для стабилизации соединения
                    }
                },
                onWelcome: (message) => {
                    this.log(`👋 Welcome from server: ${message.connection_id}`, 'info');
                    this.log(`🆔 Client ID: ${message.client_id}`, 'info');
                    
                    // Автоматически заполняем поле targetClientId реальным ID клиента
                    if (message.client_id) {
                        this.elements.targetClientId.value = message.client_id;
                        this.log(`🎯 Field targetClientId auto-filled: ${message.client_id}`, 'info');
                    }
                },
                onMessage: (message) => {
                    // Общие сообщения (не room_message)
                    this.log(`📨 Message received: ${JSON.stringify(message)}`, 'info');
                    this.metrics.messagesReceived++;
                    this.updateMetrics();
                },
                onRoomMessage: (message) => {
                    // Сообщения в комнатах
                    this.log(`📨 Room message: ${message.message}`, 'info');
                    this.metrics.messagesReceived++;
                    this.updateMetrics();
                },
                onError: (error) => {
                    this.log(`❌ WebSocket error: ${error.data.error}`, 'error');
                    this.updateConnectionStatus('error');
                },
                onServerError: (error) => {
                    this.log(`❌ WebSocket error: ${error.error}`, 'error');
                    this.updateConnectionStatus('error');
                },
                onDisconnect: (data) => {
                    this.log(`🔌 WebSocket disconnected: ${data.data.code} ${data.data.reason}`, 'warning');
                    this.updateConnectionStatus('disconnected');
                    
                    // Деактивируем кнопки после отключения
                    this.disableControls();
                },
                onReconnect: (data) => {
                    this.log(`🔄 Reconnecting... Attempt ${data.attempt}/${data.maxAttempts} in ${data.delay}ms`, 'warning');
                    
                    // Если были в комнате, переподписываемся на неё
                    if (this.currentRoom) {
                        this.log(`🔄 Resubscribe to room: ${this.currentRoom}`, 'info');
                        // Используем setTimeout чтобы дождаться завершения переподключения
                        setTimeout(() => {
                            if (this.client && this.client.isConnected()) {
                                this.client.joinRoom(this.currentRoom);
                                this.log(`✅ Resubscribed to room ${this.currentRoom}`, 'success');
                            }
                        }, data.delay + 100); // Добавляем небольшую задержку
                    }
                },
                onJoinRoom: (data) => {
                    this.log(`🏠 Joined room: ${data.roomId}`, 'success');
                    this.currentRoom = data.roomId;
                    this.elements.leaveRoomBtn.disabled = false;
                    this.updateMetrics();
                },
                onLeaveRoom: (data) => {
                    this.log(`🚪 Left room: ${data.roomId}`, 'info');
                    if (this.currentRoom === data.roomId) {
                        this.currentRoom = null;
                        this.elements.leaveRoomBtn.disabled = true;
                    }
                    this.updateMetrics();
                },
                onPing: (data) => {
                    this.log(`🏓 Ping received from server`, 'info');
                },
                onPong: (data) => {
                    this.log(`🏓 Pong received, latency: ${data.latency}ms`, 'info');
                },
                onMessageAck: (data) => {
                    this.log(`✅ Message acknowledgment received`, 'info');
                },
                onDirectMessage: (data) => {
                    this.log(`💬 Direct message from ${data.from_client_id}: ${data.message}`);
                }
            });

            // Подключаемся
            await this.client.connect();
            this.updateConnectionStatus('connected');
            this.log('✅ Подключение установлено', 'success');
            
            // Активируем кнопки после подключения
            this.enableControls();
            
            // Если переподключение и была активная комната, переподписываемся
            if (this.currentRoom && this.client.isConnected()) {
                this.log(`🔄 Автоматическая переподписка на комнату: ${this.currentRoom}`, 'info');
                this.client.joinRoom(this.currentRoom);
            }

        } catch (error) {
            this.log(`❌ Connection error: ${error.message}`, 'error');
            this.updateConnectionStatus('error');
        }
    }





    disconnect() {
        if (this.client) {
            if (this.client.disconnect && typeof this.client.disconnect === 'function') {
                this.client.disconnect();
                this.log('🚪 Отключение от сервера', 'info');
            }
            
            this.client = null;
            this.currentRoom = null;
        }
        
        this.updateConnectionStatus('disconnected');
        this.disableControls();
        this.log('🔌 Disconnected from server', 'warning');
    }

    async joinRoom() {
        const roomId = this.elements.roomId.value.trim();
        if (!roomId) {
            this.log('❌ Room ID cannot be empty', 'error');
            return;
        }

        if (!this.client) {
            this.log('❌ WebSocket not connected', 'error');
            return;
        }

        try {
            const success = await this.client.joinRoom(roomId);
            if (success) {
                this.log(`🏠 Attempting to join room: ${roomId}`, 'info');
                this.currentRoom = roomId;
                this.elements.leaveRoomBtn.disabled = false; // Активируем кнопку выхода
                this.updateMetrics();
            } else {
                this.log(`❌ Failed to join room: ${roomId}`, 'error');
            }
        } catch (error) {
            this.log(`❌ Error joining room: ${error.message}`, 'error');
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) {
            this.log('❌ You are not in any room', 'error');
            return;
        }

        if (!this.client) {
            this.log('❌ WebSocket not connected', 'error');
            return;
        }

        try {
            const success = await this.client.leaveRoom(this.currentRoom);
            if (success) {
                this.log(`🚪 Attempting to leave room: ${this.currentRoom}`, 'info');
                this.currentRoom = null;
                this.elements.leaveRoomBtn.disabled = true; // Деактивируем кнопку выхода
                this.updateMetrics();
            } else {
                this.log(`❌ Failed to leave room: ${this.currentRoom}`, 'error');
            }
        } catch (error) {
            this.log(`❌ Error leaving room: ${error.message}`, 'error');
        }
    }

        sendMessage() {
        const message = this.elements.messageText.value.trim();
        
        if (!message) {
            this.log('❌ Message cannot be empty', 'error');
            return;
        }
        
        if (!this.client) {
            this.log('❌ WebSocket not connected', 'error');
            return;
        }
        
        try {
            if (this.client.send && typeof this.client.send === 'function') {
                const success = this.client.send(message);
                if (success) {
                    this.log(`📤 Message sent: ${message}`, 'success');
                    this.elements.messageText.value = '';
                    this.metrics.messagesSent++;
                    this.updateMetrics();
                } else {
                    this.log(`❌ Failed to send message`, 'error');
                }
            } else {
                this.log('❌ Send method not available', 'error');
            }
        } catch (error) {
            this.log(`❌ Error sending message: ${error.message}`, 'error');
        }
    }

    async sendToRoom() {
        const message = this.elements.messageText.value.trim();
        const roomId = this.elements.targetRoom.value.trim() || this.currentRoom;
        
        if (!message) {
            this.log('❌ Message cannot be empty', 'error');
            return;
        }
        
        if (!roomId) {
            this.log('❌ Specify room or join a room', 'error');
            return;
        }
        
        if (!this.client) {
            this.log('❌ WebSocket не подключен', 'error');
            return;
        }
        
        try {
            if (this.client.sendToRoom && typeof this.client.sendToRoom === 'function') {
                const success = this.client.sendToRoom(roomId, message);
                if (success) {
                    this.log(`📤 Message sent to room ${roomId}: ${message}`, 'success');
                    this.elements.messageText.value = '';
                    this.metrics.messagesSent++;
                    this.updateMetrics();
                } else {
                    this.log(`❌ Failed to send message to room`, 'error');
                }
            } else {
                this.log('❌ SendToRoom method not available', 'error');
            }
        } catch (error) {
            this.log(`❌ Error sending message to room: ${error.message}`, 'error');
        }
    }

    async sendDirectMessage() {
        const targetClientId = this.elements.targetClientId.value.trim();
        const message = this.elements.directMessageText.value.trim();
        
        if (!targetClientId) {
            this.log('❌ Client ID cannot be empty', 'error');
            return;
        }
        
        if (!message) {
            this.log('❌ Message cannot be empty', 'error');
            return;
        }
        
        if (!this.client) {
            this.log('❌ WebSocket не подключен', 'error');
            return;
        }
        
        try {
            if (this.client.sendDirectMessage && typeof this.client.sendDirectMessage === 'function') {
                const success = await this.client.sendDirectMessage(targetClientId, message);
                if (success) {
                    this.log(`📤 Direct message sent to client ${targetClientId}: ${message}`, 'success');
                    this.elements.directMessageText.value = '';
                    this.metrics.messagesSent++;
                    this.updateMetrics();
                } else {
                    this.log(`❌ Failed to send direct message`, 'error');
                }
            } else {
                this.log('❌ SendDirectMessage method not available', 'error');
            }
        } catch (error) {
            this.log(`❌ Error sending direct message: ${error.message}`, 'error');
        }
    }

    async loadRooms() {
        try {
            const response = await fetch('/websocket/rooms');
            const data = await response.json();
            
            if (data.success && Array.isArray(data.rooms)) {
                this.displayRooms(data.rooms);
            } else {
                this.log('⚠️ No available rooms or invalid response format', 'warning');
                this.displayRooms([]);
            }
        } catch (error) {
            this.log(`❌ Error loading rooms: ${error.message}`, 'error');
            this.displayRooms([]);
        }
    }

    displayRooms(rooms) {
        this.elements.roomsList.innerHTML = '';
        
        rooms.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-card';
            roomCard.innerHTML = `
                <h3>🏠 ${room.name}</h3>
                <p>ID: ${room.id}</p>
                <div class="room-stats">
                    <span>Подключений: ${room.connectionsCount}</span>
                </div>
                <div class="message-input">
                    <input type="text" placeholder="Сообщение для комнаты" class="room-message-input">
                    <button class="btn btn-success send-room-message" data-room-id="${room.id}">📤</button>
                </div>
            `;
            
            // Добавляем обработчик для отправки сообщения в комнату
            const sendBtn = roomCard.querySelector('.send-room-message');
            const messageInput = roomCard.querySelector('.room-message-input');
            
            sendBtn.addEventListener('click', () => {
                const message = messageInput.value;
                if (message) {
                    this.sendToSpecificRoom(room.id, message);
                    messageInput.value = '';
                }
            });
            
            this.elements.roomsList.appendChild(roomCard);
        });
    }

    async sendToSpecificRoom(roomId, message) {
        try {
            const success = await this.client.sendToRoom(roomId, message);
            if (success) {
                this.log(`📤 Sent to room ${roomId}: ${message}`, 'info');
                this.metrics.messagesSent++;
                this.updateMetrics();
            } else {
                this.log(`❌ Failed to send message to room`, 'error');
            }
        } catch (error) {
            this.log(`❌ Error sending to room: ${error.message}`, 'error');
        }
    }

    updateConnectionStatus(status) {
        this.elements.connectionStatus.className = `status ${status}`;
        
        switch (status) {
            case 'connected':
                this.elements.connectionStatus.innerHTML = '🔌 Connected';
                break;
            case 'disconnected':
                this.elements.connectionStatus.innerHTML = '🔌 Disconnected';
                break;
            case 'connecting':
                this.elements.connectionStatus.innerHTML = '🔌 Connecting...';
                break;
        }
    }

    enableControls() {
        this.elements.connectBtn.disabled = true; // Отключаем кнопку подключения
        this.elements.disconnectBtn.disabled = false;
        this.elements.joinRoomBtn.disabled = false;
        this.elements.sendMessageBtn.disabled = false;
        this.elements.sendToRoomBtn.disabled = false;
        this.elements.sendDirectMessageBtn.disabled = false;
        
        this.log('🔓 Controls activated', 'success');
    }

    disableControls() {
        this.elements.connectBtn.disabled = false; // Активируем кнопку подключения
        this.elements.disconnectBtn.disabled = true;
        this.elements.joinRoomBtn.disabled = true;
        this.elements.leaveRoomBtn.disabled = true;
        this.elements.sendMessageBtn.disabled = true;
        this.elements.sendToRoomBtn.disabled = true;
        this.elements.sendDirectMessageBtn.disabled = true;
        
        this.log('🔒 Controls deactivated', 'warning');
    }

    updateMetrics() {
        this.elements.messagesSent.textContent = this.metrics.messagesSent;
        this.elements.messagesReceived.textContent = this.metrics.messagesReceived;
        this.elements.currentRoom.textContent = this.currentRoom || '-';
    }

    refreshMetrics() {
        this.loadRooms();
        this.updateMetrics();
        this.log('🔄 Metrics updated', 'info');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}\n`;
        
        this.elements.eventLog.textContent += logEntry;
        this.elements.eventLog.scrollTop = this.elements.eventLog.scrollHeight;
        
        // Цветовая индикация в консоли
        switch (type) {
            case 'error':
                console.error(message);
                break;
            case 'warning':
                console.warn(message);
                break;
            case 'success':
                console.log(message);
                break;
            default:
                console.log(message);
        }
    }

    clearLog() {
        this.elements.eventLog.textContent = '';
        this.log('🗑️ Log cleared', 'info');
    }

    exportLog() {
        const logContent = this.elements.eventLog.textContent;
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `websocket-log-${new Date().toISOString().slice(0, 19)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.log('💾 Log exported', 'success');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.websocketDemo = new WebSocketClientDemo();
    console.log('🔌 WebSocket Client Demo initialized');
});
