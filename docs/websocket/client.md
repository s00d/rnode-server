# WebSocket Client

## Overview

RNode WebSocket Client provides a high-performance, feature-rich WebSocket client with automatic reconnection, room management, and event handling.

**Key Features:**
- Automatic reconnection with configurable attempts
- Room-based messaging system
- Built-in ping/pong health monitoring
- Event-driven architecture
- TypeScript support
- Browser and Node.js compatibility
- Message blocking and filtering support

## Installation

:::tabs
== npm
```bash
npm install @rnode-server/websocket-client
```

== pnpm
```bash
pnpm add @rnode-server/websocket-client
```

== yarn
```bash
yarn add @rnode-server/websocket-client
```
:::

### CDN (Browser)

```html
<script src="https://unpkg.com/@rnode-server/websocket-client/dist/index.js"></script>
```

## Basic Usage

### ES Modules

```javascript
import { RNodeWebSocketClient } from '@rnode-server/websocket-client';

const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  clientId: 'my-client-id',
  autoReconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  pingInterval: 30000,
  pongTimeout: 10000,
  
  onConnect: (event) => {
    console.log('Connected:', event);
  },
  onMessage: (event) => {
    console.log('Message received:', event);
  },
  onDisconnect: (event) => {
    console.log('Disconnected:', event);
  },
  onError: (event) => {
    console.error('Error:', event);
  }
});

// Connect to server
await client.connect();
```

### Browser (Global)

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Client</title>
    <script src="https://unpkg.com/rnode-websocket-client/dist/index.js"></script>
</head>
<body>
    <div id="status">Disconnected</div>
    <input id="message" placeholder="Message">
    <button onclick="sendMessage()">Send</button>
    <div id="messages"></div>

    <script>
        const client = new RNodeWebSocketClient({
            url: 'ws://localhost:4547/chat',
            onConnect: () => {
                document.getElementById('status').textContent = 'Connected';
            },
            onMessage: (event) => {
                const div = document.createElement('div');
                div.textContent = event.data;
                document.getElementById('messages').appendChild(div);
            }
        });

        async function sendMessage() {
            const message = document.getElementById('message').value;
            client.send(message);
            document.getElementById('message').value = '';
        }

        client.connect();
    </script>
</body>
</html>
```

## Configuration Options

### WebSocketOptions Interface

```typescript
interface WebSocketOptions {
  url: string;                    // WebSocket server URL
  protocols?: string | string[];   // WebSocket protocols
  clientId?: string;              // Client identifier
  autoReconnect?: boolean;        // Enable auto-reconnection
  reconnectAttempts?: number;    // Max reconnection attempts
  reconnectDelay?: number;        // Delay between attempts (ms)
  pingInterval?: number;          // Ping interval (ms)
  pongTimeout?: number;           // Pong timeout (ms)
  
  // Event handlers
  onConnect?: (event: WebSocketEvent) => void;
  onMessage?: (event: WebSocketEvent) => void;
  onBinaryMessage?: (event: WebSocketEvent) => void;
  onDisconnect?: (event: WebSocketEvent) => void;
  onError?: (event: WebSocketEvent) => void;
  onWelcome?: (message: WelcomeMessage) => void;
  onReconnect?: (data: ReconnectEvent) => void;
  onJoinRoom?: (data: RoomEvent) => void;
  onLeaveRoom?: (data: RoomEvent) => void;
  onPing?: (data: PingEvent) => void;
  onPong?: (data: PongEvent) => void;
  onMessageAck?: (data: MessageAckEvent) => void;
  onRoomMessage?: (data: RoomMessageEvent) => void;
  onDirectMessage?: (data: DirectMessageEvent) => void;
  onServerError?: (data: ServerErrorEvent) => void;
  onMessageBlocked?: (data: MessageBlockedEvent) => void;
}
```

### Default Configuration

```javascript
const defaultOptions = {
  autoReconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  pingInterval: 30000,
  pongTimeout: 10000
};
```

## Client Methods

### Connection Management

```javascript
// Connect to server
await client.connect();

// Disconnect from server
client.disconnect();

// Check connection status
const isConnected = client.isConnected();

// Get connection state
const state = client.getState();

// Get connection status
const status = client.getConnectionStatus();
```

### Message Sending

```javascript
// Send text message
client.send('Hello world!');

// Send JSON message
client.send(JSON.stringify({
  type: 'chat',
  message: 'Hello world!',
  timestamp: Date.now()
}));

// Send binary data
client.send(new ArrayBuffer(8));
```

### Room Management

```javascript
// Join room
await client.joinRoom('general');

// Leave room
await client.leaveRoom('general');

// Send message to room
client.sendToRoom('general', 'Hello room!');

// Get current room
const currentRoom = client.getCurrentRoom();
```

### Direct Messaging

```javascript
// Send direct message to specific client
await client.sendDirectMessage('client-id', 'Private message');

// Get client ID
const clientId = client.getClientId();
```

### Statistics and Monitoring

```javascript
// Get connection statistics
const stats = client.getStats();
console.log('Connection status:', stats.connection);
console.log('Latency:', stats.latency);
console.log('Reconnection attempts:', stats.reconnectionAttempts);

// Get ping/pong latency
const latency = client.getLatency();
console.log('Current latency:', latency, 'ms');
```

## Event Handling

### Connection Events

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onConnect: (event) => {
    console.log('Connected to server');
    console.log('Connection ID:', event.data.connection_id);
    console.log('Client ID:', event.data.client_id);
  },
  
  onDisconnect: (event) => {
    console.log('Disconnected from server');
    console.log('Code:', event.data.code);
    console.log('Reason:', event.data.reason);
  },
  
  onError: (event) => {
    console.error('WebSocket error:', event.data.error);
  },
  
  onServerError: (event) => {
    console.error('Server error:', event.error);
  }
});
```

### Message Events

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onMessage: (event) => {
    console.log('General message:', event.data);
  },
  
  onRoomMessage: (event) => {
    console.log('Room message:', event.message);
    console.log('Room ID:', event.room_id);
    console.log('Timestamp:', event.timestamp);
  },
  
  onDirectMessage: (event) => {
    console.log('Direct message from:', event.from_client_id);
    console.log('Message:', event.message);
  },
  
  onMessageAck: (event) => {
    console.log('Message acknowledged:', event.message);
  },
  
  onBinaryMessage: (event) => {
    console.log('Binary message received:', event.data);
  },
  
  onMessageBlocked: (event) => {
    console.log('Message was blocked:', event.reason);
    console.log('Original message:', event.originalMessage);
  }
});
```

### Room Events

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onJoinRoom: (event) => {
    console.log('Joined room:', event.roomId);
    console.log('Timestamp:', event.timestamp);
  },
  
  onLeaveRoom: (event) => {
    console.log('Left room:', event.roomId);
    console.log('Timestamp:', event.timestamp);
  }
});
```

### Health Monitoring

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onPing: (event) => {
    console.log('Ping sent at:', event.timestamp);
  },
  
  onPong: (event) => {
    console.log('Pong received, latency:', event.latency, 'ms');
  }
});
```

### Reconnection Events

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onReconnect: (event) => {
    console.log(`Reconnecting... Attempt ${event.attempt}/${event.maxAttempts}`);
    console.log('Delay:', event.delay, 'ms');
  }
});
```

### Welcome Events

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onWelcome: (message) => {
    console.log('Welcome message received');
    console.log('Connection ID:', message.connection_id);
    console.log('Client ID:', message.client_id);
    console.log('Path:', message.path);
  }
});
```

## Utility Functions

### WebSocketUtils

```javascript
import { WebSocketUtils } from '@rnode-server/websocket-client';

// Check WebSocket support
if (WebSocketUtils.isSupported()) {
  console.log('WebSocket is supported');
}

// Get connection state string
const stateString = WebSocketUtils.getStateString(WebSocket.OPEN);
console.log('State:', stateString); // "OPEN"

// Generate unique client ID
const clientId = WebSocketUtils.generateClientId();
console.log('Client ID:', clientId); // "client_1234567890_abc123"

// Validate WebSocket URL
const isValid = WebSocketUtils.isValidUrl('ws://localhost:4547/chat');
console.log('Valid URL:', isValid); // true
```

### Logger

```javascript
import { Logger, LogLevel } from '@rnode-server/websocket-client';

const logger = new Logger({
  level: LogLevel.DEBUG,
  prefix: '[WebSocket]'
});

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

## Advanced Usage

### Custom Message Types

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onMessage: (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'chat':
          handleChatMessage(data);
          break;
        case 'notification':
          handleNotification(data);
          break;
        case 'game_move':
          handleGameMove(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
});

function handleChatMessage(data) {
  console.log(`[${data.username}]: ${data.message}`);
}

function handleNotification(data) {
  console.log(`Notification: ${data.title} - ${data.body}`);
}

function handleGameMove(data) {
  console.log(`Game move: ${data.player} -> ${data.move}`);
}
```

### Error Handling

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onError: (event) => {
    console.error('WebSocket error:', event.data.error);
    
    // Handle specific error types
    if (event.data.error.includes('connection refused')) {
      console.log('Server is not available, retrying...');
    } else if (event.data.error.includes('authentication')) {
      console.log('Authentication failed, please login');
    }
  },
  
  onServerError: (event) => {
    console.error('Server error:', event.error);
    
    // Handle server-specific errors
    switch (event.error_type) {
      case 'validation_error':
        console.log('Message validation failed');
        break;
      case 'room_full':
        console.log('Room is full');
        break;
      case 'unauthorized':
        console.log('Unauthorized access');
        break;
      default:
        console.log('Unknown server error');
    }
  },
  
  onDisconnect: (event) => {
    if (event.data.code === 1006) {
      console.log('Connection lost unexpectedly');
    } else if (event.data.code === 1000) {
      console.log('Connection closed normally');
    }
  }
});
```

### Reconnection Strategy

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  autoReconnect: true,
  reconnectAttempts: 10,
  reconnectDelay: 2000,
  
  onReconnect: (event) => {
    console.log(`Reconnection attempt ${event.attempt}/${event.maxAttempts}`);
    
    // Exponential backoff
    if (event.attempt > 5) {
      const delay = Math.min(2000 * Math.pow(2, event.attempt - 5), 30000);
      console.log(`Using exponential backoff: ${delay}ms`);
    }
  }
});
```

### Room Management

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onJoinRoom: async (event) => {
    console.log('Joined room:', event.roomId);
    
    // Send welcome message to room
    await client.sendToRoom(event.roomId, 'Hello everyone!');
    
    // Update UI
    updateRoomUI(event.roomId);
  },
  
  onLeaveRoom: (event) => {
    console.log('Left room:', event.roomId);
    
    // Clean up UI
    cleanupRoomUI(event.roomId);
  },
  
  onRoomMessage: (event) => {
    console.log(`[${event.room_id}]: ${event.message}`);
    
    // Display message in room UI
    displayRoomMessage(event.room_id, event.message);
  }
});

// Join multiple rooms
async function joinRooms() {
  await client.joinRoom('general');
  await client.joinRoom('game');
  await client.joinRoom('admin');
}

// Leave all rooms
async function leaveAllRooms() {
  const currentRoom = client.getCurrentRoom();
  if (currentRoom) {
    await client.leaveRoom(currentRoom);
  }
}
```

### Message Blocking and Filtering

```javascript
const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  
  onMessageBlocked: (event) => {
    console.log('Message was blocked by server');
    console.log('Reason:', event.reason);
    console.log('Original message:', event.originalMessage);
    console.log('Blocked at:', event.timestamp);
    
    // Show user notification
    showNotification('Message blocked: ' + event.reason);
  },
  
  onMessage: (event) => {
    // Check if message was blocked
    if (event.data && event.data.blocked) {
      console.log('Message blocked by client-side filter');
      return;
    }
    
    // Process normal message
    console.log('Message received:', event.data);
  }
});
```

## Browser Integration

### HTML Demo

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Client Demo</title>
    <script src="https://unpkg.com/@rnode-server/websocket-client/dist/index.js"></script>
    <style>
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .connected { background: #d4edda; color: #155724; }
        .disconnected { background: #f8d7da; color: #721c24; }
        .connecting { background: #fff3cd; color: #856404; }
        .message { margin: 5px 0; padding: 5px; background: #f8f9fa; }
    </style>
</head>
<body>
    <h1>WebSocket Client Demo</h1>
    
    <div id="status" class="status disconnected">Disconnected</div>
    
    <div>
        <input id="messageInput" placeholder="Enter message" style="width: 300px;">
        <button onclick="sendMessage()">Send</button>
        <button onclick="joinRoom()">Join Room</button>
        <button onclick="leaveRoom()">Leave Room</button>
    </div>
    
    <div id="messages"></div>
    
    <script>
        const client = new RNodeWebSocketClient({
            url: 'ws://localhost:4547/chat',
            clientId: WebSocketUtils.generateClientId(),
            autoReconnect: true,
            
            onConnect: () => {
                document.getElementById('status').className = 'status connected';
                document.getElementById('status').textContent = 'Connected';
                addMessage('System: Connected to server');
            },
            
            onDisconnect: () => {
                document.getElementById('status').className = 'status disconnected';
                document.getElementById('status').textContent = 'Disconnected';
                addMessage('System: Disconnected from server');
            },
            
            onMessage: (event) => {
                addMessage(`Message: ${event.data}`);
            },
            
            onRoomMessage: (event) => {
                addMessage(`[Room ${event.room_id}]: ${event.message}`);
            },
            
            onJoinRoom: (event) => {
                addMessage(`System: Joined room ${event.roomId}`);
            },
            
            onLeaveRoom: (event) => {
                addMessage(`System: Left room ${event.roomId}`);
            },
            
            onWelcome: (message) => {
                addMessage(`System: Welcome! Client ID: ${message.client_id}`);
            },
            
            onMessageBlocked: (event) => {
                addMessage(`System: Message blocked - ${event.reason}`);
            }
        });
        
        function addMessage(text) {
            const div = document.createElement('div');
            div.className = 'message';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
            document.getElementById('messages').appendChild(div);
        }
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (message) {
                client.send(message);
                input.value = '';
            }
        }
        
        function joinRoom() {
            const roomId = prompt('Enter room ID:');
            if (roomId) {
                client.joinRoom(roomId);
            }
        }
        
        function leaveRoom() {
            const currentRoom = client.getCurrentRoom();
            if (currentRoom) {
                client.leaveRoom(currentRoom);
            }
        }
        
        // Connect on page load
        client.connect();
    </script>
</body>
</html>
```

## Node.js Usage

```javascript
import { RNodeWebSocketClient } from '@rnode-server/websocket-client';

const client = new RNodeWebSocketClient({
  url: 'ws://localhost:4547/chat',
  clientId: 'node-client',
  
  onConnect: () => {
    console.log('Connected to WebSocket server');
  },
  
  onMessage: (event) => {
    console.log('Received:', event.data);
  },
  
  onWelcome: (message) => {
    console.log('Welcome! Connection ID:', message.connection_id);
  }
});

// Connect and send message
async function main() {
  await client.connect();
  client.send('Hello from Node.js!');
  
  // Keep connection alive
  setInterval(() => {
    if (client.isConnected()) {
      client.send('Heartbeat');
    }
  }, 30000);
}

main().catch(console.error);
```

## Type Definitions

### Event Types

```typescript
interface WebSocketEvent {
  type: string;
  data?: unknown;
  timestamp: number;
}

interface WelcomeMessage {
  type: 'welcome';
  connection_id: string;
  client_id: string;
  path: string;
  timestamp: string;
}

interface ReconnectEvent {
  attempt: number;
  maxAttempts: number;
  delay: number;
  timestamp: number;
}

interface RoomEvent {
  roomId: string;
  timestamp: number;
}

interface PingEvent {
  timestamp: number;
}

interface PongEvent {
  latency: number;
  timestamp: number;
}

interface MessageAckEvent {
  message: string;
  timestamp: string;
  type: string;
}

interface RoomMessageEvent {
  message: string;
  room_id: string;
  timestamp: string;
  type: string;
}

interface DirectMessageEvent {
  message: string;
  from_client_id: string;
  timestamp: string;
  type: string;
}

interface ServerErrorEvent {
  error: string;
  error_type: string;
  timestamp: string;
  type: string;
}

interface MessageBlockedEvent {
  originalMessage: string;
  reason: string;
  timestamp: string;
  type: string;
}
```

## Best Practices

### Error Handling

1. **Always handle errors**: Implement `onError` and `onServerError` callbacks
2. **Validate messages**: Parse and validate incoming messages
3. **Handle disconnections**: Implement reconnection logic
4. **Monitor connection state**: Check `isConnected()` before sending

### Performance

1. **Use appropriate ping intervals**: 30-60 seconds for most applications
2. **Limit message size**: Keep messages under 1MB
3. **Batch messages**: Group multiple messages when possible
4. **Monitor memory usage**: Clean up event listeners

### Security

1. **Validate URLs**: Use `WebSocketUtils.isValidUrl()`
2. **Sanitize messages**: Validate and sanitize user input
3. **Use WSS**: Use secure WebSocket connections in production
4. **Implement authentication**: Add authentication to your WebSocket server

### Message Handling

1. **Handle blocked messages**: Implement `onMessageBlocked` callback
2. **Validate message types**: Check message structure before processing
3. **Handle binary data**: Implement `onBinaryMessage` for binary data
4. **Monitor message flow**: Track message acknowledgments

## Related

- [WebSocket Server](./websocket.md) - Server-side implementation
- [Architecture](./websocket-optimization.md) - System design overview
- [Examples](./websocket.md) - Practical usage examples
