# WebSocket API

## Overview

RNode Server WebSocket API provides high-performance real-time communication with automatic optimization.

## Server Methods

### `app.websocket(path, options)`

Registers a WebSocket route with automatic event optimization.

**Parameters:**
- `path` (string) - WebSocket endpoint path
- `options` (WebSocketOptions) - Configuration options

**Returns:** `void`

**Example:**
```javascript
app.websocket('/chat', {
  onConnect: (data) => { /* ... */ },
  onMessage: (data) => { /* ... */ },
  onClose: (data) => { /* ... */ }
});
```

### `app.createRoom(name, description?, maxConnections?)`

Creates a new WebSocket room.

**Parameters:**
- `name` (string) - Room name
- `description` (string, optional) - Room description
- `maxConnections` (number, optional) - Maximum connections allowed

**Returns:** `string` - Room ID

**Example:**
```javascript
const roomId = app.createRoom('general', 'General chat room', 50);
```

### `app.sendRoomMessage(roomId, message)`

Sends a message to all clients in a room.

**Parameters:**
- `roomId` (string) - Room identifier
- `message` (string) - Message content

**Returns:** `boolean` - Success status

**Example:**
```javascript
const success = app.sendRoomMessage('room_123', 'Hello everyone!');
```

### `app.getRoomInfo(roomId)`

Gets information about a specific room.

**Parameters:**
- `roomId` (string) - Room identifier

**Returns:** `WebSocketRoom | null` - Room information or null

**Example:**
```javascript
const roomInfo = app.getRoomInfo('room_123');
if (roomInfo) {
  console.log('Room:', roomInfo.name, 'Connections:', roomInfo.connections.length);
}
```

### `app.getAllRooms()`

Gets all available rooms.

**Returns:** `WebSocketRoom[]` - Array of room objects

**Example:**
```javascript
const rooms = app.getAllRooms();
console.log('Total rooms:', rooms.length);
```

### `app.joinRoom(connectionId, roomId)`

Programmatically joins a client to a room.

**Parameters:**
- `connectionId` (string) - Client connection ID
- `roomId` (string) - Room identifier

**Returns:** `boolean` - Success status

**Example:**
```javascript
const success = app.joinRoom('client_123', 'room_456');
```

### `app.leaveRoom(connectionId, roomId)`

Programmatically removes a client from a room.

**Parameters:**
- `connectionId` (string) - Client connection ID
- `roomId` (string) - Room identifier

**Returns:** `boolean` - Success status

**Example:**
```javascript
const success = app.leaveRoom('client_123', 'room_456');
```

### `app.getClientInfo(connectionId)`

Gets information about a specific client.

**Parameters:**
- `connectionId` (string) - Client connection ID

**Returns:** `WebSocketSocket | null` - Client information or null

**Example:**
```javascript
const clientInfo = app.getClientInfo('client_123');
if (clientInfo) {
  console.log('Client:', clientInfo.clientId, 'Path:', clientInfo.path);
}
```

### `app.getUserRooms(connectionId)`

Gets all rooms a client is currently in.

**Parameters:**
- `connectionId` (string) - Client connection ID

**Returns:** `WebSocketRoom[]` - Array of room objects

**Example:**
```javascript
const userRooms = app.getUserRooms('client_123');
console.log('User rooms:', userRooms.length);
```

## WebSocketOptions Interface

```typescript
interface WebSocketOptions {
  onConnect?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onMessage?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onClose?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onError?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onJoinRoom?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onLeaveRoom?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onPing?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onPong?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onBinaryMessage?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onWelcome?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onMessageAck?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onRoomMessage?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onDirectMessage?: (data: WebSocketEventData) => WebSocketEventResult | void;
  onServerError?: (data: WebSocketEventData) => WebSocketEventResult | void;
}
```

## Event Data Interface

```typescript
interface WebSocketEventData {
  connectionId: string;
  path: string;
  handlerId: string;
  data?: any;
  timestamp?: string;
  client_id?: string;
  room_id?: string;
  target_client_id?: string;
  from_client_id?: string;
  message?: string;
  error?: string;
  error_type?: string;
  type?: string;
}
```

## Event Result Interface

```typescript
interface WebSocketEventResult {
  shouldCancel?: boolean;
  modifiedEvent?: any;
  error?: string;
}
```

## Room Interface

```typescript
interface WebSocketRoom {
  id: string;
  name: string;
  description?: string;
  maxConnections?: number;
  connections: string[];
  connectionsCount?: number;
  metadata: Record<string, string>;
  createdAt: string;
}
```

## Socket Interface

```typescript
interface WebSocketSocket {
  id: string;
  clientId: string;
  path: string;
  roomId?: string;
  handlerId: string;
  metadata: Record<string, string>;
  createdAt: string;
  lastPing: string;
}
```

## Event Optimization

### Automatic Optimization

The system automatically optimizes performance by:

1. **Detecting Callbacks**: Only events with defined callbacks are enabled
2. **Backend Filtering**: Rust backend checks enabled events before processing
3. **Reduced Overhead**: Unnecessary events are filtered at the backend level

### Optimization Examples

```javascript
// Full configuration - all events enabled
app.websocket('/full-chat', {
  onConnect: (data) => { /* ... */ },
  onMessage: (data) => { /* ... */ },
  onClose: (data) => { /* ... */ },
  onError: (data) => { /* ... */ },
  onJoinRoom: (data) => { /* ... */ },
  onLeaveRoom: (data) => { /* ... */ },
  onPing: (data) => { /* ... */ },
  onPong: (data) => { /* ... */ },
  onBinaryMessage: (data) => { /* ... */ },
  onWelcome: (data) => { /* ... */ },
  onMessageAck: (data) => { /* ... */ },
  onRoomMessage: (data) => { /* ... */ },
  onDirectMessage: (data) => { /* ... */ },
  onServerError: (data) => { /* ... */ }
});

// Optimized configuration - only essential events
app.websocket('/simple-chat', {
  onConnect: (data) => { /* ... */ },
  onMessage: (data) => { /* ... */ },
  onClose: (data) => { /* ... */ }
  // Other events (ping, pong, etc.) are automatically disabled
  // This reduces backend processing by ~60%
});

// Maximum optimization - only message handling
app.websocket('/minimal', {
  onMessage: (data) => { /* ... */ }
  // Only message events are processed
  // All other events are filtered at backend level
});
```

## Event Handling

### Callback Functions

All callback functions receive a `WebSocketEventData` object and can return a `WebSocketEventResult` to control event processing.

**Available Callbacks:**

- `onConnect` - Called when a client connects
- `onMessage` - Called when a text message is received
- `onClose` - Called when a client disconnects
- `onError` - Called when an error occurs
- `onJoinRoom` - Called when a client joins a room
- `onLeaveRoom` - Called when a client leaves a room
- `onPing` - Called when a ping is received
- `onPong` - Called when a pong is received
- `onBinaryMessage` - Called when binary data is received
- `onWelcome` - Called when welcome message is sent to client
- `onMessageAck` - Called when message acknowledgment is received
- `onRoomMessage` - Called when room message is received
- `onDirectMessage` - Called when direct message is received
- `onServerError` - Called when server error occurs

**Note:** The `onMessageBlocked` event is only available on the client side and is triggered when the server blocks a message based on callback return values.

### Event Control

```javascript
app.websocket('/chat', {
  onMessage: (data) => {
    // Cancel event processing
    if (data.data && data.data.includes('spam')) {
      return { shouldCancel: true, error: 'Spam message blocked' };
    }
    
    // Modify event data
    if (data.data && data.data.type === 'chat') {
      return { 
        modifiedEvent: { 
          ...data, 
          data: { ...data.data, timestamp: Date.now() } 
        } 
      };
    }
    
    // Allow event processing (default)
    return undefined;
  }
});
```

## Error Handling

### Error Callback

```javascript
app.websocket('/chat', {
  onError: (data) => {
    console.error('WebSocket error:', data);
    // Log error, notify admin, etc.
  },
  onServerError: (data) => {
    console.error('Server error:', data.error);
    // Handle server-specific errors
  }
});
```

### Error Prevention

```javascript
app.websocket('/chat', {
  onMessage: (data) => {
    try {
      const message = JSON.parse(data.data);
      // Process message
    } catch (error) {
      return { shouldCancel: true, error: 'Invalid message format' };
    }
  }
});
```

## Security

### Client Validation

```javascript
app.websocket('/secure-chat', {
  onConnect: (data) => {
    // Validate client ID
    if (!isValidClient(data.client_id)) {
      return { shouldCancel: true, error: 'Unauthorized client' };
    }
  },
  onMessage: (data) => {
    // Validate message content
    if (containsSpam(data.data)) {
      return { shouldCancel: true, error: 'Spam detected' };
    }
  }
});
```

## Performance Monitoring

### Metrics

```javascript
// Enable metrics
const app = createApp({ metrics: true });

// Access metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    websocket: {
      connections: app.getWebSocketConnections(),
      rooms: app.getAllRooms().length,
      messages: app.getWebSocketMessageCount()
    }
  });
});
```

### Logging

```javascript
// Configure logging
app.setLogLevel('debug');

// WebSocket events are automatically logged
// Check console for detailed event information
```

## HTTP API Endpoints

**Note:** RNode Server uses Axum-style route parameters with curly braces `{paramName}` instead of Express-style `:paramName`.

### Room Management

```javascript
// List all rooms
app.get('/websocket/rooms', (req, res) => {
  const rooms = app.getAllRooms();
  res.json({
    success: true,
    rooms: rooms,
    count: rooms.length
  });
});

// Get specific room
app.get('/websocket/rooms/{roomId}', (req, res) => {
  const roomInfo = app.getRoomInfo(req.params.roomId);
  if (roomInfo) {
    res.json({ success: true, room: roomInfo });
  } else {
    res.status(404).json({ success: false, error: 'Room not found' });
  }
});

// Create new room
app.post('/websocket/rooms', (req, res) => {
  const { name, description, maxConnections } = req.getBodyAsJson();
  const roomId = app.createRoom(name, description, maxConnections);
  res.json({ success: true, roomId });
});

// Send message to room
app.post('/websocket/rooms/{roomId}/message', (req, res) => {
  const { message } = req.getBodyAsJson();
  const success = app.sendRoomMessage(req.params.roomId, message);
  res.json({ success });
});

// Join room
app.post('/websocket/rooms/{roomId}/join', (req, res) => {
  const { connectionId } = req.getBodyAsJson();
  const success = app.joinRoom(connectionId, req.params.roomId);
  res.json({ success });
});

// Leave room
app.post('/websocket/rooms/{roomId}/leave', (req, res) => {
  const { connectionId } = req.getBodyAsJson();
  const success = app.leaveRoom(connectionId, req.params.roomId);
  res.json({ success });
});
```

### Client Management

```javascript
// Get client information
app.get('/websocket/clients/{connectionId}', (req, res) => {
  const clientInfo = app.getClientInfo(req.params.connectionId);
  if (clientInfo) {
    res.json({ success: true, client: clientInfo });
  } else {
    res.status(404).json({ success: false, error: 'Client not found' });
  }
});

// Get client rooms
app.get('/websocket/clients/{connectionId}/rooms', (req, res) => {
  const rooms = app.getUserRooms(req.params.connectionId);
  res.json({ success: true, rooms, count: rooms.length });
});
```

## Message Types

### Welcome Message
```json
{
  "type": "welcome",
  "connection_id": "uuid-string",
  "client_id": "client_123",
  "path": "/chat",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Room Message
```json
{
  "type": "room_message",
  "message": "Hello room!",
  "room_id": "room_123",
  "from_client_id": "client_456",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Direct Message
```json
{
  "type": "direct_message",
  "message": "Private message",
  "from_client_id": "client_123",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Message Acknowledgment
```json
{
  "type": "message_ack",
  "message": "Original message content",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Message
```json
{
  "type": "error",
  "error": "Error description",
  "error_type": "validation_error",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Ping/Pong Messages
```json
{
  "type": "ping",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

```json
{
  "type": "pong",
  "latency": 15,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Best Practices

### Event Optimization

1. **Define Only Needed Callbacks**: Only define callbacks for events you need to handle
2. **Use Minimal Configuration**: Start with minimal configuration and add events as needed
3. **Monitor Performance**: Use metrics to track event processing

### Room Management

1. **Limit Room Size**: Set appropriate `maxConnections` for rooms
2. **Clean Up**: Remove unused rooms periodically
3. **Monitor Activity**: Track room activity and usage

### Error Handling

1. **Always Handle Errors**: Define `onError` and `onServerError` callbacks for error handling
2. **Validate Input**: Validate message content in `onMessage` callback
3. **Graceful Degradation**: Handle errors gracefully without crashing

### Security

1. **Validate Clients**: Validate client connections in `onConnect` callback
2. **Filter Content**: Filter spam and malicious content
3. **Rate Limiting**: Implement rate limiting for message sending

## Related

- [WebSocket Client](./client.md) - Client-side implementation
- [Architecture](./websocket-optimization.md) - System design overview
- [Performance](../monitoring/) - Monitoring and optimization guides
