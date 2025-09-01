# Cache Architecture

## System Overview

RNode Server's caching system is designed as a multi-level cache that automatically manages data migration between different storage tiers for optimal performance and resource utilization.

## Cache Levels

### L1 - Memory Cache
- **Storage**: In-memory storage using Rust's efficient data structures
- **Speed**: Fastest access time (nanoseconds)
- **Capacity**: Limited by available RAM
- **Persistence**: Data lost on application restart
- **Use Case**: Frequently accessed data, hot data

### L2 - Redis Cache
- **Storage**: Redis in-memory database
- **Speed**: Very fast access time (microseconds)
- **Capacity**: Limited by Redis memory configuration
- **Persistence**: Configurable persistence options
- **Use Case**: Distributed caching, shared data between instances

### L3 - File Cache
- **Storage**: File system storage
- **Speed**: Slower access time (milliseconds)
- **Capacity**: Limited by available disk space
- **Persistence**: Persistent across application restarts
- **Use Case**: Large data sets, cold data, backup storage

## Cascade Check Strategy

When retrieving data, the system checks cache levels in the following order:

1. **Memory Cache (L1)** - Fastest level
2. **Redis Cache (L2)** - If L1 miss
3. **File Cache (L3)** - If L1 and L2 miss

When data is found in lower levels, it's automatically copied to upper levels to accelerate subsequent requests.

### Read Flow
```
Request → L1 (Memory) → L2 (Redis) → L3 (File) → Primary Source
   ↓         ↓           ↓           ↓
  Hit      Miss        Miss        Miss
   ↓         ↓           ↓           ↓
 Return   Check L2    Check L3   Load & Cache
```

## Write Strategy

When storing data, the system saves it to all available levels:

1. **Memory Cache** - For fast access
2. **Redis Cache** - For distributed access (if configured)
3. **File Cache** - For persistent storage

### Write Flow
```
Store Request → L1 (Memory) → L2 (Redis) → L3 (File)
     ↓             ↓           ↓           ↓
   Success      Success     Success     Success
```

## Data Migration

### Hot Data Promotion
- Frequently accessed data automatically moves to faster levels
- Memory cache prioritizes hot data
- Automatic eviction of cold data to lower levels

### Cold Data Demotion
- Infrequently accessed data moves to slower levels
- File cache stores cold data for persistence
- Automatic cleanup of expired data

## Memory Management

### Memory Eviction
- LRU (Least Recently Used) eviction policy
- Configurable memory limits
- Automatic garbage collection
- Memory pressure handling

### Cache Size Limits
```typescript
const cache = app.cache({
  maxMemory: 100 * 1024 * 1024, // 100MB limit
  defaultTtl: 3600              // 1 hour default
});
```

## Performance Characteristics

### Access Times
- **Memory Cache**: ~100 nanoseconds
- **Redis Cache**: ~1-10 microseconds
- **File Cache**: ~1-10 milliseconds

### Throughput
- **Memory Cache**: Millions of operations per second
- **Redis Cache**: Hundreds of thousands of operations per second
- **File Cache**: Thousands of operations per second

## Synchronous Operations

### Design Philosophy
- All cache operations are synchronous
- No async/await overhead
- Immediate response times
- Simplified error handling

### Benefits
- Predictable performance
- No callback complexity
- Easier debugging
- Better integration with existing code

## Error Handling

### Graceful Degradation
- Cache failures don't break application
- Automatic fallback to primary data sources
- Comprehensive error logging
- Recovery mechanisms

### Error Types
- **Connection Errors**: Redis connection failures
- **Storage Errors**: File system issues
- **Memory Errors**: Out of memory conditions
- **Serialization Errors**: Data format issues

## Configuration Options

### CacheConfig Interface
```typescript
interface CacheConfig {
  defaultTtl?: number;      // Default TTL in seconds
  maxMemory?: number;        // Maximum memory usage in bytes
  redisUrl?: string;         // Redis connection URL
  fileCachePath?: string;    // File cache directory path
}
```

### Configuration Examples

#### Memory-only Configuration
```typescript
const cache = app.cache({
  defaultTtl: 3600,
  maxMemory: 50 * 1024 * 1024, // 50MB
  fileCachePath: './cache'
});
```

#### Distributed Configuration
```typescript
const cache = app.cache({
  defaultTtl: 1800,
  maxMemory: 100 * 1024 * 1024, // 100MB
  redisUrl: 'redis://localhost:6379',
  fileCachePath: './cache'
});
```

## Tag-based Organization

### Tag System
- Group related cache entries with tags
- Bulk invalidation by tags
- Hierarchical organization
- Efficient cache management

### Tag Usage
```typescript
// Cache with tags
cache.set('user:123', user, { 
  ttl: 3600, 
  tags: ['users', 'profile'] 
});

// Invalidate by tags
cache.flushByTags(['users']);
```

## Monitoring and Metrics

### Built-in Metrics
- Cache hit rates by level
- Memory usage statistics
- Operation latency
- Error rates

### Performance Monitoring
```typescript
// Monitor cache performance
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate);
console.log('Memory usage:', stats.memoryUsage);
```

## Security Considerations

### Data Protection
- Secure serialization of sensitive data
- Access control for cache operations
- Encryption for persistent storage
- Audit logging for cache operations

### Best Practices
- Don't cache sensitive authentication data
- Use appropriate TTL for different data types
- Implement proper cache invalidation
- Monitor cache performance regularly

## Scalability

### Horizontal Scaling
- Redis enables distributed caching
- Multiple application instances can share cache
- Automatic data synchronization
- Load balancing support

### Vertical Scaling
- Configurable memory limits
- Efficient memory usage
- Automatic resource management
- Performance optimization

## Integration Patterns

### Database Integration
- Cache database query results
- Implement cache-aside pattern
- Handle cache invalidation on data changes
- Optimize query performance

### API Integration
- Cache external API responses
- Implement response caching middleware
- Handle API rate limiting
- Optimize external service calls

## Future Enhancements

### Planned Features
- Compression for large data sets
- Advanced eviction policies
- Cache warming strategies
- Predictive caching
- Machine learning optimization
