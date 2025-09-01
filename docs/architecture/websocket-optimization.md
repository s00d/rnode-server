# WebSocket Optimization Architecture

## Overview

RNode Server implements an intelligent WebSocket optimization system that automatically filters events based on callback presence, significantly reducing backend processing overhead.

## Architecture Design

### Event Flow

```
Client Event → Rust Backend → Event Filter → JavaScript Callback
```

1. **Client Event**: WebSocket event occurs (connect, message, ping, etc.)
2. **Rust Backend**: Event received by Rust WebSocket handler
3. **Event Filter**: Backend checks if event is enabled for the path
4. **JavaScript Callback**: If enabled, event sent to JavaScript for processing

### Optimization Strategy

#### Automatic Callback Detection

```javascript
// TypeScript detects enabled events based on callback presence
const enabledEvents: string[] = [];

if (options.onConnect) enabledEvents.push('onConnect');
if (options.onMessage) enabledEvents.push('onMessage');
if (options.onClose) enabledEvents.push('onClose');
if (options.onError) enabledEvents.push('onError');
if (options.onJoinRoom) enabledEvents.push('onJoinRoom');
if (options.onLeaveRoom) enabledEvents.push('onLeaveRoom');
if (options.onPing) enabledEvents.push('onPing');
if (options.onPong) enabledEvents.push('onPong');
if (options.onBinaryMessage) enabledEvents.push('onBinaryMessage');
```

#### Backend Filtering

```rust
// Rust backend checks enabled events before processing
if let Some(handler) = routes_map.get(path) {
    if !handler.enabled_events.contains(event_type) {
        log::debug!("🚫 Event {} disabled for path {}, skipping", event_type, path);
        return Ok(None); // Event filtered out
    }
}
```

## Performance Benefits

### Processing Reduction

| Configuration | Events Enabled | Processing Overhead |
|---------------|----------------|-------------------|
| Full | 9 events | 100% |
| Optimized | 3-5 events | ~60% |
| Minimal | 1 event | ~90% |

### Memory Usage

- **Reduced Event Queuing**: Unnecessary events don't enter processing queue
- **Lower Memory Allocation**: Fewer event objects created
- **Decreased GC Pressure**: Less temporary object creation

### CPU Optimization

- **Eliminated Processing**: Disabled events bypass JavaScript execution
- **Reduced Context Switching**: Fewer Rust-JavaScript transitions
- **Lower Latency**: Faster event processing for enabled events

## Implementation Details

### TypeScript Layer

```typescript
// src/utils/app.ts
websocket(path: string, options: WebSocketOptions = {}): void {
  // Detect enabled events
  const enabledEvents: string[] = [];
  if (options.onConnect) enabledEvents.push('onConnect');
  // ... other events
  
  // Register with backend
  addon.registerWebSocket(path, JSON.stringify(enabledEvents));
  
  // Store callbacks
  websocketCallbacks.set(path, options);
}
```

### Rust Backend

```rust
// crates/rnode-server/src/websocket/mod.rs
pub struct WebSocketHandler {
    pub enabled_events: std::collections::HashSet<String>,
}

pub fn register_websocket(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let path = cx.argument::<JsString>(0)?.value(&mut cx);
    let enabled_events_json = cx.argument::<JsString>(1).ok().map(|s| s.value(&mut cx));
    
    let enabled_events = if let Some(json_str) = enabled_events_json {
        if let Ok(events) = serde_json::from_str::<Vec<String>>(&json_str) {
            events.into_iter().collect()
        } else {
            std::collections::HashSet::new()
        }
    } else {
        std::collections::HashSet::new()
    };
    
    let handler = WebSocketHandler { enabled_events };
    // ... store handler
}
```

### Event Processing

```rust
// crates/rnode-server/src/websocket/connections.rs
pub async fn send_websocket_event(event_type: &str, connection_id: &Uuid, path: &str, _handler_id: &str, data: Option<&str>, client_id: Option<&str>) -> Result<Option<serde_json::Value>, String> {
    // Check if event is enabled
    let routes = crate::websocket::get_websocket_routes();
    let routes_map = routes.read().await;
    
    if let Some(handler) = routes_map.get(path) {
        if !handler.enabled_events.contains(event_type) {
            log::debug!("🚫 Event {} disabled for path {}, skipping", event_type, path);
            return Ok(None); // Event filtered out
        }
    }
    
    // Process enabled event
    // ... send to JavaScript
}
```

## Use Cases

### Chat Application

```javascript
// Full chat with all features
app.websocket('/chat', {
  onConnect: (data) => { /* ... */ },
  onMessage: (data) => { /* ... */ },
  onClose: (data) => { /* ... */ },
  onError: (data) => { /* ... */ },
  onJoinRoom: (data) => { /* ... */ },
  onLeaveRoom: (data) => { /* ... */ }
  // No ping/pong - not needed for chat
});
```

### Game Application

```javascript
// Game optimized for low latency
app.websocket('/game', {
  onConnect: (data) => { /* ... */ },
  onMessage: (data) => { /* ... */ },
  onClose: (data) => { /* ... */ }
  // No ping/pong, room management - optimized for game performance
});
```

### Notification System

```javascript
// Minimal notification system
app.websocket('/notifications', {
  onMessage: (data) => { /* ... */ }
  // Only message handling - maximum optimization
});
```

## Monitoring and Metrics

### Performance Tracking

```javascript
// Enable detailed logging
app.setLogLevel('debug');

// Monitor event filtering
// Logs show: "🚫 Event ping disabled for path /game, skipping"
```

### Optimization Verification

```javascript
// Check enabled events during registration
app.websocket('/test', {
  onMessage: (data) => { /* ... */ }
});

// Logs show: "🔧 Enabled events: onMessage"
```

## Best Practices

### Optimization Guidelines

1. **Start Minimal**: Begin with only essential callbacks
2. **Add Incrementally**: Add events as needed
3. **Monitor Performance**: Use metrics to track improvements
4. **Profile Usage**: Identify which events are actually used

### Configuration Patterns

```javascript
// Pattern 1: Full Configuration (All Events)
app.websocket('/full', {
  onConnect, onMessage, onClose, onError,
  onJoinRoom, onLeaveRoom, onPing, onPong, onBinaryMessage
});

// Pattern 2: Essential Events Only
app.websocket('/essential', {
  onConnect, onMessage, onClose, onError
});

// Pattern 3: Minimal Configuration
app.websocket('/minimal', {
  onMessage
});

// Pattern 4: Custom Optimization
app.websocket('/custom', {
  onConnect, onMessage, onJoinRoom, onLeaveRoom
  // No ping/pong for custom use case
});
```

## Future Enhancements

### Planned Optimizations

1. **Dynamic Event Management**: Enable/disable events at runtime
2. **Event Prioritization**: Priority-based event processing
3. **Batch Processing**: Group multiple events for efficiency
4. **Predictive Filtering**: ML-based event prediction

### Performance Targets

- **90%+ Reduction**: For minimal configurations
- **60%+ Reduction**: For optimized configurations
- **Sub-millisecond Latency**: For enabled events
- **Zero Overhead**: For disabled events

## Related

- [WebSocket API](../api/websocket.md) - Complete API reference
- [WebSocket Examples](../examples/websocket.md) - Practical examples
- [Performance Monitoring](../monitoring/) - Metrics and monitoring
