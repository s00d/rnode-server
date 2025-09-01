# Caching System

## Overview

RNode Server includes a high-performance multi-level caching system that provides fast data access and reduces load on primary data sources. The caching system supports memory, Redis, and file-based storage with automatic data migration between levels.

## Key Components

- **[Overview](./index.md)** - Caching system introduction
- **[API Reference](./api.md)** - Complete caching API documentation
- **[Examples](./examples.md)** - Practical caching examples
- **[Architecture](./architecture.md)** - System architecture and design

## Quick Start

### Initialize Cache System
```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// Initialize cache system
const cache = app.cache({
  defaultTtl: 3600,                    // 1 hour default TTL
  maxMemory: 100 * 1024 * 1024,       // 100MB memory limit
  redisUrl: 'redis://localhost:6379',  // Redis connection
  fileCachePath: './cache'             // File cache directory
});
```

### Basic Operations
```javascript
// Set value with TTL
const success = cache.set('user:123', { name: 'John', email: 'john@example.com' }, { 
  ttl: 3600 
});

// Get value
const user = cache.get('user:123');

// Check existence
const exists = cache.exists('user:123');

// Delete value
const deleted = cache.delete('user:123');
```

## Cache Features

- **Multi-level Storage** - Memory, Redis, and file-based caching
- **Automatic Migration** - Hot data moves to faster levels
- **TTL Support** - Configurable time-to-live for cache entries
- **Tag-based Invalidation** - Group and invalidate related cache entries
- **Synchronous Operations** - No async overhead
- **Type Safety** - Full TypeScript support

## Cache Levels

1. **L1 - Memory Cache** - Fastest level, stores data in RAM
2. **L2 - Redis Cache** - Distributed cache for multiple instances
3. **L3 - File Cache** - Persistent storage on disk

## Configuration Options

```javascript
const cache = app.cache({
  defaultTtl: 3600,                    // Default TTL in seconds
  maxMemory: 100 * 1024 * 1024,       // Maximum memory usage in bytes
  redisUrl: 'redis://localhost:6379',  // Redis connection URL
  fileCachePath: './cache'             // File cache directory path
});
```

## Next Steps

- [API Reference](./api.md) - Complete caching API documentation
- [Examples](./examples.md) - Practical caching examples
- [Architecture](./architecture.md) - System architecture and design
- [API Reference](../api/) - Complete API documentation
