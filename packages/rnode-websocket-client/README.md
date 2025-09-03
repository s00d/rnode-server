# @rnode-server/websocket-client

WebSocket client for RNode Server with support for rooms, automatic reconnection, and ping/pong mechanism.

## Installation

```bash
npm install @rnode-server/websocket-client
```

## Quick Start

```typescript
import { createWebSocketClient, WebSocketEvent } from '@rnode-server/websocket-client';

// Create client
const client = createWebSocketClient({
  url: 'ws://localhost:3000/chat',
  clientId: 'user123',
  autoReconnect: true,
  onConnect: (event: WebSocketEvent) => {
    console.log('Connected to server!');
  },
  onMessage: (event: WebSocketEvent) => {
    console.log('Received message:', event.data);
  }
});

// Connect
await client.connect();

// Send message
client.send('Hello, world!');

// Join room
client.joinRoom('general');

// Send message to room
client.send('Message to room', 'general');
```

## Key Features

### 🔌 Automatic Reconnection
- Exponential backoff between attempts
- Configurable number of attempts
- Configurable reconnection interval

### 🏠 Room System
- Join rooms
- Send messages to specific rooms
- Automatic tracking of current room

### 🏓 Ping/Pong Mechanism
- Automatic connection health check
- Configurable intervals
- Timeouts for detecting "dead" connections

### 📱 Events
- `onConnect` - connection established
- `onDisconnect` - connection closed
- `onMessage` - message received
- `onError` - error occurred
- `onJoinRoom` - joined room
- `onLeaveRoom` - left room
- `onPing` - ping sent
- `onPong` - pong received

## API

### RNodeWebSocketClient

#### Constructor
```typescript
new RNodeWebSocketClient(options: WebSocketOptions)
```

#### Methods

##### `connect(): Promise<void>`
Connect to WebSocket server.

##### `disconnect(): void`
Disconnect from server.

##### `send(data: any, roomId?: string): boolean`
Send message. If `roomId` is not specified, message is sent to current room.

##### `joinRoom(roomId: string): boolean`
Join room.

##### `leaveRoom(roomId?: string): boolean`
Leave room. If `roomId` is not specified, leave current room.

##### `isConnected(): boolean`
Check connection status.

##### `getState(): number`
Get current WebSocket state.

##### `getCurrentRoom(): string | null`
Get current room ID.

##### `updateOptions(newOptions: Partial<WebSocketOptions>): void`
Update client configuration.

### WebSocketOptions

```typescript
interface WebSocketOptions {
  url: string;                           // WebSocket server URL
  protocols?: string | string[];         // WebSocket protocols
  clientId?: string;                     // Client ID
  autoReconnect?: boolean;                // Automatic reconnection
  reconnectInterval?: number;            // Reconnection interval (ms)
  maxReconnectAttempts?: number;         // Maximum number of attempts
  pingInterval?: number;                 // Ping interval (ms)
  pongTimeout?: number;                  // Pong timeout (ms)
  onConnect?: (event: WebSocketEvent) => void;
  onDisconnect?: (event: WebSocketEvent) => void;
  onMessage?: (event: WebSocketEvent) => void;
  onError?: (event: WebSocketEvent) => void;
  onJoinRoom?: (event: WebSocketEvent) => void;
  onLeaveRoom?: (event: WebSocketEvent) => void;
  onPing?: (event: WebSocketEvent) => void;
  onPong?: (event: WebSocketEvent) => void;
}
```

### WebSocketEvent

```typescript
interface WebSocketEvent {
  type: 'connect' | 'disconnect' | 'message' | 'error' | 'join_room' | 'leave_room' | 'ping' | 'pong';
  data: any;
  timestamp: number;
}
```

## Usage Examples

### Chat Application

```typescript
import { createWebSocketClient } from '@rnode-server/websocket-client';

const chatClient = createWebSocketClient({
  url: 'ws://localhost:3000/chat',
  clientId: 'user_' + Date.now(),
  autoReconnect: true,
  
  onConnect: () => {
    console.log('Connected to chat');
    chatClient.joinRoom('general');
  },
  
  onMessage: (event) => {
    const message = event.data;
    if (message.type === 'chat') {
      displayMessage(message.data);
    }
  },
  
  onJoinRoom: (event) => {
    console.log(`Joined room: ${event.data.roomId}`);
  }
});

// Connect
await chatClient.connect();

// Send message to chat
function sendMessage(text: string) {
  chatClient.send({
    type: 'chat',
    text,
    timestamp: Date.now()
  }, 'general');
}
```

### Game Application

```typescript
import { createWebSocketClient } from '@rnode-server/websocket-client';

const gameClient = createWebSocketClient({
  url: 'ws://localhost:3000/game',
  clientId: 'player_' + Math.random().toString(36).substr(2, 9),
  autoReconnect: true,
  pingInterval: 1000, // Frequent pings for games
  
  onConnect: () => {
    console.log('Connected to game server');
  },
  
  onMessage: (event) => {
    const gameEvent = event.data;
    switch (gameEvent.type) {
      case 'player_move':
        updatePlayerPosition(gameEvent.playerId, gameEvent.position);
        break;
      case 'game_state':
        updateGameState(gameEvent.state);
        break;
    }
  }
});

// Connect to game room
await gameClient.connect();
gameClient.joinRoom('game_room_1');

// Send player movement
function sendPlayerMove(position: { x: number, y: number }) {
  gameClient.send({
    type: 'player_move',
    position,
    timestamp: Date.now()
  }, 'game_room_1');
}
```

## Build

```bash
npm run build
```

## Development

```bash
npm run dev
```

## License

MIT
