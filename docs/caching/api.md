# Cache API Reference

## CacheManager Interface

The `CacheManager` interface provides all caching operations with full TypeScript support.

```typescript
interface CacheManager {
  // Core operations
  get<T = string>(key: string, tags?: string[]): T | null;
  set<T = string>(key: string, value: T, options?: CacheOptions): boolean;
  delete(key: string, tags?: string[]): boolean;
  exists(key: string, tags?: string[]): boolean;
  clear(): boolean;
  
  // Tag operations
  flushByTags(tags: string[]): number;
}
```

## Configuration Interfaces

### CacheConfig

Configuration for cache system initialization.

```typescript
interface CacheConfig {
  defaultTtl?: number;      // Default TTL in seconds
  maxMemory?: number;        // Maximum memory usage in bytes
  redisUrl?: string;         // Redis connection URL
  fileCachePath?: string;    // File cache directory path
}
```

### CacheOptions

Options for individual cache operations.

```typescript
interface CacheOptions {
  ttl?: number;             // Time-to-live in seconds
  tags?: string[];          // Tags for grouping and invalidation
}
```

## Core Methods

### `cache.get<T>(key: string, tags?: string[]): T | null`

Retrieves a value from cache. Returns `null` if the key doesn't exist.

```typescript
// Get string value
const greeting = cache.get<string>('greeting');

// Get object value
const user = cache.get<User>('user:123');

// Get with tags
const user = cache.get<User>('user:123', ['users', 'profile']);
```

### `cache.set<T>(key: string, value: T, options?: CacheOptions): boolean`

Stores a value in cache. Returns `true` on success, `false` on failure.

```typescript
// Set string value
const success = cache.set('greeting', 'Hello, World!', { ttl: 3600 });

// Set object value
const user = { id: 123, name: 'John', email: 'john@example.com' };
const success = cache.set('user:123', user, { ttl: 1800 }); // 30 minutes

// Set with tags
const success = cache.set('user:123', user, { 
  ttl: 3600, 
  tags: ['users', 'profile'] 
});

// Set with default TTL
const success = cache.set('temp:data', 'temporary data');
```

### `cache.delete(key: string, tags?: string[]): boolean`

Removes a value from all cache levels. Returns `true` if the key was found and deleted.

```typescript
// Delete by key
const deleted = cache.delete('user:123');

// Delete with tags
const deleted = cache.delete('user:123', ['users']);
```

### `cache.exists(key: string, tags?: string[]): boolean`

Checks if a key exists in cache. Returns `true` if the key exists.

```typescript
// Check existence
const exists = cache.exists('user:123');

// Check with tags
const exists = cache.exists('user:123', ['users']);
```

### `cache.clear(): boolean`

Clears all cache levels. Returns `true` on success.

```typescript
const cleared = cache.clear();
if (cleared) {
  console.log('Cache cleared successfully');
} else {
  console.log('Failed to clear cache');
}
```

## Tag Operations

### `cache.flushByTags(tags: string[]): number`

Invalidates all cache entries with the specified tags. Returns the number of invalidated entries.

```typescript
// Invalidate all user-related cache entries
const count = cache.flushByTags(['users']);
console.log(`Invalidated ${count} cache entries`);

// Invalidate multiple tag groups
const count = cache.flushByTags(['users', 'profiles']);
```

## Error Handling

All cache operations include comprehensive error handling:

```typescript
try {
  const value = cache.get('key');
  if (value !== null) {
    console.log('Value:', value);
  } else {
    console.log('Key not found');
  }
} catch (error) {
  console.error('Cache error:', error);
  // Fallback to primary data source
}
```

## Type Safety

The cache system provides full TypeScript support:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe operations
const user = cache.get<User>('user:123');
if (user) {
  console.log(user.name); // TypeScript knows this is a User object
}

const success = cache.set<User>('user:123', {
  id: 123,
  name: 'John',
  email: 'john@example.com'
}, { ttl: 3600 });
```

## Performance Considerations

- **Synchronous Operations**: No async overhead for better performance
- **Multi-level Caching**: Automatic data migration between levels
- **Memory Management**: Automatic eviction of old entries
- **Type Safety**: Compile-time type checking for better reliability

## Best Practices

1. **Use Descriptive Keys**: Use meaningful key names like `user:123:profile`
2. **Set Appropriate TTL**: Balance between performance and data freshness
3. **Use Tags for Grouping**: Group related data with tags for easy invalidation
4. **Handle Cache Misses**: Always provide fallback to primary data sources
5. **Monitor Cache Performance**: Track hit rates and adjust configuration accordingly
