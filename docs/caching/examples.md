# Cache Examples

## Basic Usage

### Simple Caching

```typescript
import { createApp } from 'rnode-server';

const app = createApp();
const cache = app.cache();

// Basic set and get
cache.set('greeting', 'Hello, World!', { ttl: 3600 });
const greeting = cache.get('greeting');
console.log(greeting); // "Hello, World!"
```

### Object Caching

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 123,
  name: 'John Doe',
  email: 'john@example.com'
};

// Cache user object
cache.set('user:123', user, { ttl: 1800 }); // 30 minutes

// Retrieve with type safety
const cachedUser = cache.get<User>('user:123');
if (cachedUser) {
  console.log(cachedUser.name); // "John Doe"
}
```

## User Management with Caching

### Get User with Caching

```typescript
async function getUser(id: number): Promise<User | null> {
  const cacheKey = `user:${id}`;
  
  // Try to get from cache first
  const cached = cache.get<User>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // If not in cache, load from database
  const user = await loadUserFromDatabase(id);
  if (user) {
    // Cache for 1 hour
    cache.set(cacheKey, user, { ttl: 3600 });
  }
  
  return user;
}
```

### Update User with Cache Invalidation

```typescript
async function updateUser(id: number, data: Partial<User>): Promise<User | null> {
  const user = await updateUserInDatabase(id, data);
  if (user) {
    // Update cache
    cache.set(`user:${id}`, user, { ttl: 3600 });
  }
  return user;
}
```

### Delete User with Cache Cleanup

```typescript
async function deleteUser(id: number): Promise<boolean> {
  const deleted = await deleteUserFromDatabase(id);
  if (deleted) {
    // Remove from cache
    cache.delete(`user:${id}`);
  }
  return deleted;
}
```

## Session Management

### Session Caching

```typescript
class SessionManager {
  private cache = app.cache();
  
  setSession(sessionId: string, data: any, ttl: number = 3600): boolean {
    return this.cache.set(`session:${sessionId}`, data, { ttl });
  }
  
  getSession(sessionId: string): any {
    return this.cache.get(`session:${sessionId}`);
  }
  
  deleteSession(sessionId: string): boolean {
    return this.cache.delete(`session:${sessionId}`);
  }
  
  sessionExists(sessionId: string): boolean {
    return this.cache.exists(`session:${sessionId}`);
  }
}

const sessionManager = new SessionManager();
```

## Response Caching Middleware

### Cache Middleware

```typescript
function createCacheMiddleware(ttl: number = 300) {
  return (req: any, res: any, next: any) => {
    const cacheKey = `${req.method}:${req.url}`;
    
    // Try to get from cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to cache responses
    res.json = function(data: any) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, { ttl });
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// Usage
app.use('/api/users', createCacheMiddleware(600)); // 10 minutes
app.use('/api/products', createCacheMiddleware(1800)); // 30 minutes
```

## Tag-based Caching

### Using Tags for Grouping

```typescript
// Cache user data with tags
cache.set('user:123', user, { 
  ttl: 3600, 
  tags: ['users', 'profile'] 
});

// Cache user posts with tags
cache.set('user:123:posts', posts, { 
  ttl: 1800, 
  tags: ['users', 'posts'] 
});

// Cache user settings with tags
cache.set('user:123:settings', settings, { 
  ttl: 7200, 
  tags: ['users', 'settings'] 
});
```

### Tag-based Invalidation

```typescript
// Invalidate all user-related cache entries
function invalidateUserCache(userId: number) {
  const count = cache.flushByTags(['users']);
  console.log(`Invalidated ${count} user-related cache entries`);
}

// Invalidate specific user data
function invalidateUserProfile(userId: number) {
  const count = cache.flushByTags(['users', 'profile']);
  console.log(`Invalidated ${count} user profile cache entries`);
}
```

## Configuration Examples

### Minimal Configuration

```typescript
// Memory-only cache
const cache = app.cache();
```

### Full Configuration

```typescript
// Complete cache configuration
const cache = app.cache({
  defaultTtl: 7200,                    // 2 hours
  maxMemory: 200 * 1024 * 1024,       // 200MB
  redisUrl: 'redis://localhost:6379',  // Redis
  fileCachePath: './data/cache'        // File cache
});
```

### Memory-only Configuration

```typescript
// Memory cache only
const cache = app.cache({
  defaultTtl: 3600,
  maxMemory: 50 * 1024 * 1024,        // 50MB
  fileCachePath: './cache'
});
```

### Redis Configuration

```typescript
// With Redis
const cache = app.cache({
  defaultTtl: 1800,                    // 30 minutes
  maxMemory: 100 * 1024 * 1024,       // 100MB
  redisUrl: 'redis://user:pass@redis.example.com:6379',
  fileCachePath: './cache'
});
```

## Testing Cache Operations

### Cache Testing

```typescript
function testCacheOperations() {
  const testKey = 'test:key';
  const testValue = { message: 'Hello, Cache!' };
  
  // Test write
  const writeSuccess = cache.set(testKey, testValue, { ttl: 60 });
  console.log('Write success:', writeSuccess);
  
  // Test read
  const readValue = cache.get(testKey);
  console.log('Read value:', readValue);
  
  // Test existence
  const exists = cache.exists(testKey);
  console.log('Key exists:', exists);
  
  // Test delete
  const deleted = cache.delete(testKey);
  console.log('Delete success:', deleted);
  
  // Verify deletion
  const afterDelete = cache.get(testKey);
  console.log('After delete:', afterDelete); // null
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
function safeCacheOperation() {
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
}

function safeCacheSet(key: string, value: any, options?: any) {
  try {
    const success = cache.set(key, value, options);
    if (success) {
      console.log('Value cached successfully');
    } else {
      console.log('Failed to cache value');
    }
    return success;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}
```

## Performance Optimization

### Cache Hit Rate Monitoring

```typescript
class CacheMonitor {
  private hits = 0;
  private misses = 0;
  
  get(key: string) {
    const value = cache.get(key);
    if (value !== null) {
      this.hits++;
      return value;
    } else {
      this.misses++;
      return null;
    }
  }
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
  
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate()
    };
  }
}
```
