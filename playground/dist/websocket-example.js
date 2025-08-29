"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rnode_server_1 = require("rnode-server");
const app = (0, rnode_server_1.createApp)({ logLevel: "debug", metrics: true, timeout: 3000, devMode: false });
const port = 4547;
// Load static files into memory
app.static('./websocket-client');
app.static('../packages/rnode-websocket-client/dist');
// Middleware for CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
// WebSocket маршруты с улучшенной конфигурацией
app.websocket('/chat', {
    onConnect: (data) => console.log('🔌 Chat client connected:', data),
    onMessage: (data) => console.log('📨 Chat message received:', data),
    onClose: (data) => console.log('🔌 Chat client disconnected:', data),
    onError: (data) => console.log('❌ Chat error:', data),
    onJoinRoom: (data) => console.log('🏠 Chat client joined room:', data),
    onLeaveRoom: (data) => console.log('🚪 Chat client left room:', data)
});
app.websocket('/game', {
    onConnect: (data) => console.log('🔌 Game client connected:', data),
    onMessage: (data) => console.log('📨 Game message received:', data),
    onClose: (data) => console.log('🔌 Game client disconnected:', data),
    onError: (data) => console.log('❌ Game error:', data),
    onJoinRoom: (data) => console.log('🏠 Game client joined room:', data),
    onLeaveRoom: (data) => console.log('🚪 Game client left room:', data)
});
app.websocket('/notifications', {
    onConnect: (data) => console.log('🔌 Notification client connected:', data),
    onMessage: (data) => console.log('📨 Notification message received:', data),
    onClose: (data) => console.log('🔌 Notification client disconnected:', data),
    onError: (data) => console.log('❌ Notification error:', data)
});
// HTTP маршруты для управления WebSocket
app.get('/websocket/rooms', (req, res) => {
    try {
        const rooms = app.getAllRooms();
        res.json({
            success: true,
            rooms: rooms,
            count: rooms.length
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/websocket/rooms/:roomId', (req, res) => {
    try {
        const roomId = req.params.roomId;
        const roomInfo = app.getRoomInfo(roomId);
        if (roomInfo) {
            res.json({
                success: true,
                room: roomInfo
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Room not found'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/websocket/rooms', (req, res) => {
    try {
        const { name, description, maxConnections } = req.getBodyAsJson() || {};
        if (!name) {
            res.status(400).json({
                success: false,
                error: 'Room name is required'
            });
            return;
        }
        const roomId = app.createRoom(name, description, maxConnections);
        res.json({
            success: true,
            roomId: roomId,
            message: 'Room created successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/websocket/rooms/:roomId/message', (req, res) => {
    try {
        const roomId = req.params.roomId;
        const { message } = req.getBodyAsJson() || {};
        if (!message) {
            res.status(400).json({
                success: false,
                error: 'Message is required'
            });
            return;
        }
        const success = app.sendRoomMessage(roomId, message);
        if (success) {
            res.json({
                success: true,
                message: 'Message sent to room successfully'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Failed to send message to room'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/websocket/rooms/:roomId/join', (req, res) => {
    try {
        const roomId = req.params.roomId;
        const { connectionId } = req.getBodyAsJson() || {};
        if (!connectionId) {
            res.status(400).json({
                success: false,
                error: 'Connection ID is required'
            });
            return;
        }
        const success = app.joinRoom(connectionId, roomId);
        if (success) {
            res.json({
                success: true,
                message: 'Joined room successfully'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Failed to join room'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.post('/websocket/rooms/:roomId/leave', (req, res) => {
    try {
        const roomId = req.params.roomId;
        const { connectionId } = req.getBodyAsJson() || {};
        if (!connectionId) {
            res.status(400).json({
                success: false,
                error: 'Connection ID is required'
            });
            return;
        }
        const success = app.leaveRoom(connectionId, roomId);
        if (success) {
            res.json({
                success: true,
                message: 'Left room successfully'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Failed to leave room'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/websocket/clients/:connectionId', (req, res) => {
    try {
        const connectionId = req.params.connectionId;
        const clientInfo = app.getClientInfo(connectionId);
        if (clientInfo) {
            res.json({
                success: true,
                client: clientInfo
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.get('/websocket/clients/:connectionId/rooms', (req, res) => {
    try {
        const connectionId = req.params.connectionId;
        const rooms = app.getUserRooms(connectionId);
        res.json({
            success: true,
            rooms: rooms,
            count: rooms.length
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Простые HTTP маршруты для тестирования
app.get('/hello', (req, res) => {
    res.send('Hello from WebSocket Server!');
});
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        server: 'RNode WebSocket Server',
        port: port,
        timestamp: new Date().toISOString()
    });
});
// Запуск сервера
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 WebSocket Server started on port ${port}`);
    console.log(`🔌 WebSocket endpoints:`);
    console.log(`   - ws://localhost:${port}/chat`);
    console.log(`   - ws://localhost:${port}/game`);
    console.log(`   - ws://localhost:${port}/notifications`);
    console.log(`📊 Metrics: http://localhost:${port}/metrics`);
    console.log(`🌐 Status: http://localhost:${port}/status`);
});
// Создаем несколько комнат для демонстрации
setTimeout(() => {
    try {
        console.log('🏠 Creating demo rooms...');
        const generalRoom = app.createRoom('general', 'Общий чат для всех', 50);
        console.log(`✅ Created room: general (${generalRoom})`);
        const gameRoom = app.createRoom('game', 'Игровая комната', 10);
        console.log(`✅ Created room: game (${gameRoom})`);
        const adminRoom = app.createRoom('admin', 'Админская комната', 5);
        console.log(`✅ Created room: admin (${adminRoom})`);
        console.log('🎉 Demo rooms created successfully!');
    }
    catch (error) {
        console.error('❌ Error creating demo rooms:', error);
    }
}, 1000);
// Отправляем тестовые сообщения в комнаты каждые 30 секунд
setInterval(() => {
    try {
        const rooms = app.getAllRooms();
        if (rooms.length > 0) {
            const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
            const message = `🕐 Server time: ${new Date().toLocaleTimeString()}`;
            const success = app.sendRoomMessage(randomRoom.id, message);
            if (success) {
                console.log(`📤 Sent message to room ${randomRoom.name}: ${message}`);
            }
        }
    }
    catch (error) {
        console.error('❌ Error sending test message:', error);
    }
}, 30000);
console.log('🔌 WebSocket Server example loaded');
console.log('📖 Available endpoints:');
console.log('   GET  /websocket/rooms - List all rooms');
console.log('   GET  /websocket/rooms/:id - Get room info');
console.log('   POST /websocket/rooms - Create new room');
console.log('   POST /websocket/rooms/:id/message - Send message to room');
console.log('   POST /websocket/rooms/:id/join - Join room');
console.log('   POST /websocket/rooms/:id/leave - Leave room');
console.log('   GET  /websocket/clients/:id - Get client info');
console.log('   GET  /websocket/clients/:id/rooms - Get client rooms');
console.log('   GET  /status - Server status');
console.log('   GET  /metrics - Server metrics');
