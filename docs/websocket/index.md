# WebSocket Documentation

## Overview

Complete WebSocket integration guide for RNode Server with automatic optimization and performance monitoring.

**Key Features:**
- Automatic event optimization based on callback presence
- Room-based messaging system
- Client management and tracking
- Built-in reconnection handling
- Performance monitoring and metrics

## Documentation Sections

### Getting Started
- **[Examples](./websocket.md)** - Practical examples and use cases
- **[API Reference](./websocket.md)** - Complete API documentation
- **[Client](./client.md)** - WebSocket client library
- **[Architecture](./websocket-optimization.md)** - System design and optimization

## Quick Start

### Basic WebSocket Setup

```javascript
import { createApp } from 'rnode-server';

const app = createApp({ logLevel: "debug", metrics: true });

// WebSocket route with optimization
app.websocket('/chat', {
  onConnect: (data) => {
    console.log('🔌 Client connected:', data);
  },
  onMessage: (data) => {
    console.log('📨 Message received:', data);
  },
  onClose: (data) => {
    console.log('🔌 Client disconnected:', data);
  }
});

app.listen(4547, () => {
  console.log('🚀 WebSocket Server started on port 4547');
});
```

### Optimized Configuration

```javascript
// Minimal configuration - only message handling
app.websocket('/notifications', {
  onMessage: (data) => {
    console.log('📨 Notification received:', data);
  }
  // No other callbacks - events automatically disabled
  // This optimizes performance by reducing backend processing
});
```

## Performance Optimization

### Automatic Event Filtering

The system automatically optimizes performance by:

1. **Detecting Callbacks**: Only events with defined callbacks are enabled
2. **Backend Filtering**: Rust backend checks enabled events before processing
3. **Reduced Overhead**: Unnecessary events are filtered at the backend level



## Features

### Room Management
- Create and manage WebSocket rooms
- Send messages to specific rooms
- Track room membership
- Room-based broadcasting

### Client Management
- Track client connections
- Monitor client activity
- Manage client rooms
- Client information retrieval

### Event Handling
- Connect/disconnect events
- Message processing
- Error handling
- Room join/leave events
- Ping/pong management

### Performance Monitoring
- Real-time metrics
- Connection tracking
- Message counting
- Performance logging

## Next Steps

- [Examples](./websocket.md) - Start with practical examples
- [API Reference](./websocket.md) - Complete API documentation
- [Architecture](./websocket-optimization.md) - Understand system design
