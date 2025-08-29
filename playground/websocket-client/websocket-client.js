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
            this.log('❌ URL не может быть пустым', 'error');
            return;
        }

        try {
            if (!window.RNodeWebSocketClient) {
                this.log('❌ RNodeWebSocketClient недоступен', 'error');
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
                    this.log('✅ WebSocket подключен', 'success');
                    this.updateConnectionStatus('connected');
                    this.log(`🔗 Подключен к ${data.data.url}`, 'info');
                    
                    // Активируем кнопки после подключения
                    this.enableControls();
                    
                    // Если переподключение и была активная комната, переподписываемся
                    if (this.currentRoom && this.client.isConnected()) {
                        this.log(`🔄 Автоматическая переподписка на комнату: ${this.currentRoom}`, 'info');
                        setTimeout(() => {
                            this.client.joinRoom(this.currentRoom);
                        }, 500); // Небольшая задержка для стабилизации соединения
                    }
                },
                onWelcome: (message) => {
                    this.log(`👋 Приветствие от сервера: ${message.connection_id}`, 'info');
                    this.log(`🆔 Client ID: ${message.client_id}`, 'info');
                    
                    // Автоматически заполняем поле targetClientId реальным ID клиента
                    if (message.client_id) {
                        this.elements.targetClientId.value = message.client_id;
                        this.log(`🎯 Поле targetClientId автоматически заполнено: ${message.client_id}`, 'info');
                    }
                },
                onMessage: (message) => {
                    // Общие сообщения (не room_message)
                    this.log(`📨 Сообщение получено: ${JSON.stringify(message)}`, 'info');
                    this.metrics.messagesReceived++;
                    this.updateMetrics();
                },
                onRoomMessage: (message) => {
                    // Сообщения в комнатах
                    this.log(`📨 Сообщение в комнате: ${message.message}`, 'info');
                    this.metrics.messagesReceived++;
                    this.updateMetrics();
                },
                onError: (error) => {
                    this.log(`❌ WebSocket ошибка: ${error.data.error}`, 'error');
                    this.updateConnectionStatus('error');
                },
                onDisconnect: (data) => {
                    this.log(`🔌 WebSocket отключен: ${data.data.code} ${data.data.reason}`, 'warning');
                    this.updateConnectionStatus('disconnected');
                    
                    // Деактивируем кнопки после отключения
                    this.disableControls();
                },
                onReconnect: (data) => {
                    this.log(`🔄 Переподключение... Попытка ${data.attempt}/${data.maxAttempts} через ${data.delay}ms`, 'warning');
                    
                    // Если были в комнате, переподписываемся на неё
                    if (this.currentRoom) {
                        this.log(`🔄 Переподписка на комнату: ${this.currentRoom}`, 'info');
                        // Используем setTimeout чтобы дождаться завершения переподключения
                        setTimeout(() => {
                            if (this.client && this.client.isConnected()) {
                                this.client.joinRoom(this.currentRoom);
                                this.log(`✅ Переподписка на комнату ${this.currentRoom} выполнена`, 'success');
                            }
                        }, data.delay + 100); // Добавляем небольшую задержку
                    }
                },
                onJoinRoom: (data) => {
                    this.log(`🏠 Вошли в комнату: ${data.roomId}`, 'success');
                    this.currentRoom = data.roomId;
                    this.elements.leaveRoomBtn.disabled = false;
                    this.updateMetrics();
                },
                onLeaveRoom: (data) => {
                    this.log(`🚪 Вышли из комнаты: ${data.roomId}`, 'info');
                    if (this.currentRoom === data.roomId) {
                        this.currentRoom = null;
                        this.elements.leaveRoomBtn.disabled = true;
                    }
                    this.updateMetrics();
                },
                onPing: (data) => {
                    this.log(`🏓 Ping получен от сервера`, 'info');
                },
                onPong: (data) => {
                    this.log(`🏓 Pong получен, задержка: ${data.latency}ms`, 'info');
                },
                onMessageAck: (data) => {
                    this.log(`✅ Подтверждение сообщения получено`, 'info');
                },
                onDirectMessage: (data) => {
                    this.log(`💬 Прямое сообщение от ${data.from_client_id}: ${data.message}`);
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
            this.log(`❌ Ошибка подключения: ${error.message}`, 'error');
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
        this.log('🔌 Отключено от сервера', 'warning');
    }

    async joinRoom() {
        const roomId = this.elements.roomId.value.trim();
        if (!roomId) {
            this.log('❌ ID комнаты не может быть пустым', 'error');
            return;
        }

        if (!this.client) {
            this.log('❌ WebSocket не подключен', 'error');
            return;
        }

        try {
            const success = await this.client.joinRoom(roomId);
            if (success) {
                this.log(`🏠 Попытка входа в комнату: ${roomId}`, 'info');
                this.currentRoom = roomId;
                this.elements.leaveRoomBtn.disabled = false; // Активируем кнопку выхода
                this.updateMetrics();
            } else {
                this.log(`❌ Не удалось войти в комнату: ${roomId}`, 'error');
            }
        } catch (error) {
            this.log(`❌ Ошибка входа в комнату: ${error.message}`, 'error');
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) {
            this.log('❌ Вы не находитесь в комнате', 'error');
            return;
        }

        if (!this.client) {
            this.log('❌ WebSocket не подключен', 'error');
            return;
        }

        try {
            const success = await this.client.leaveRoom(this.currentRoom);
            if (success) {
                this.log(`🚪 Попытка выхода из комнаты: ${this.currentRoom}`, 'info');
                this.currentRoom = null;
                this.elements.leaveRoomBtn.disabled = true; // Деактивируем кнопку выхода
                this.updateMetrics();
            } else {
                this.log(`❌ Не удалось выйти из комнаты: ${this.currentRoom}`, 'error');
            }
        } catch (error) {
            this.log(`❌ Ошибка выхода из комнаты: ${error.message}`, 'error');
        }
    }

    sendMessage() {
        const message = this.elements.messageText.value.trim();
        
        if (!message) {
            this.log('❌ Сообщение не может быть пустым', 'error');
            return;
        }
        
        if (!this.client) {
            this.log('❌ WebSocket не подключен', 'error');
            return;
        }
        
                try {
            if (this.client.send && typeof this.client.send === 'function') {
                const success = this.client.send(message);
                if (success) {
                    this.log(`📤 Сообщение отправлено: ${message}`, 'success');
                    this.elements.messageText.value = '';
                    this.metrics.messagesSent++;
                    this.updateMetrics();
                } else {
                    this.log(`❌ Не удалось отправить сообщение`, 'error');
                }
            } else {
                this.log('❌ Метод send недоступен', 'error');
            }
        } catch (error) {
            this.log(`❌ Ошибка отправки сообщения: ${error.message}`, 'error');
        }
    }

    async sendToRoom() {
        const message = this.elements.messageText.value.trim();
        const roomId = this.elements.targetRoom.value.trim() || this.currentRoom;
        
        if (!message) {
            this.log('❌ Сообщение не может быть пустым', 'error');
            return;
        }
        
        if (!roomId) {
            this.log('❌ Укажите комнату или войдите в комнату', 'error');
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
                    this.log(`📤 Сообщение отправлено в комнату ${roomId}: ${message}`, 'success');
                    this.elements.messageText.value = '';
                    this.metrics.messagesSent++;
                    this.updateMetrics();
                } else {
                    this.log(`❌ Не удалось отправить сообщение в комнату`, 'error');
                }
            } else {
                this.log('❌ Метод sendToRoom недоступен', 'error');
            }
        } catch (error) {
            this.log(`❌ Ошибка отправки сообщения в комнату: ${error.message}`, 'error');
        }
    }

    async sendDirectMessage() {
        const targetClientId = this.elements.targetClientId.value.trim();
        const message = this.elements.directMessageText.value.trim();
        
        if (!targetClientId) {
            this.log('❌ ID клиента не может быть пустым', 'error');
            return;
        }
        
        if (!message) {
            this.log('❌ Сообщение не может быть пустым', 'error');
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
                    this.log(`📤 Прямое сообщение отправлено клиенту ${targetClientId}: ${message}`, 'success');
                    this.elements.directMessageText.value = '';
                    this.metrics.messagesSent++;
                    this.updateMetrics();
                } else {
                    this.log(`❌ Не удалось отправить прямое сообщение`, 'error');
                }
            } else {
                this.log('❌ Метод sendDirectMessage недоступен', 'error');
            }
        } catch (error) {
            this.log(`❌ Ошибка отправки прямого сообщения: ${error.message}`, 'error');
        }
    }

    async loadRooms() {
        try {
            const response = await fetch('/websocket/rooms');
            const data = await response.json();
            
            if (data.success && Array.isArray(data.rooms)) {
                this.displayRooms(data.rooms);
            } else {
                this.log('⚠️ Нет доступных комнат или неверный формат ответа', 'warning');
                this.displayRooms([]);
            }
        } catch (error) {
            this.log(`❌ Ошибка загрузки комнат: ${error.message}`, 'error');
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
                this.log(`📤 Отправлено в комнату ${roomId}: ${message}`, 'info');
                this.metrics.messagesSent++;
                this.updateMetrics();
            } else {
                this.log(`❌ Не удалось отправить сообщение в комнату`, 'error');
            }
        } catch (error) {
            this.log(`❌ Ошибка отправки в комнату: ${error.message}`, 'error');
        }
    }

    updateConnectionStatus(status) {
        this.elements.connectionStatus.className = `status ${status}`;
        
        switch (status) {
            case 'connected':
                this.elements.connectionStatus.innerHTML = '🔌 Подключен';
                break;
            case 'disconnected':
                this.elements.connectionStatus.innerHTML = '🔌 Отключен';
                break;
            case 'connecting':
                this.elements.connectionStatus.innerHTML = '🔌 Подключение...';
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
        
        this.log('🔓 Элементы управления активированы', 'success');
    }

    disableControls() {
        this.elements.connectBtn.disabled = false; // Активируем кнопку подключения
        this.elements.disconnectBtn.disabled = true;
        this.elements.joinRoomBtn.disabled = true;
        this.elements.leaveRoomBtn.disabled = true;
        this.elements.sendMessageBtn.disabled = true;
        this.elements.sendToRoomBtn.disabled = true;
        this.elements.sendDirectMessageBtn.disabled = true;
        
        this.log('🔒 Элементы управления деактивированы', 'warning');
    }

    updateMetrics() {
        this.elements.messagesSent.textContent = this.metrics.messagesSent;
        this.elements.messagesReceived.textContent = this.metrics.messagesReceived;
        this.elements.currentRoom.textContent = this.currentRoom || '-';
    }

    refreshMetrics() {
        this.loadRooms();
        this.updateMetrics();
        this.log('🔄 Метрики обновлены', 'info');
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
        this.log('🗑️ Лог очищен', 'info');
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
        this.log('💾 Лог экспортирован', 'success');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.websocketDemo = new WebSocketClientDemo();
    console.log('🔌 WebSocket Client Demo initialized');
});
