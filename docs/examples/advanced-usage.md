# Advanced Usage Examples

## Template Engine

### Basic Template Setup
```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// Initialize Tera templates
app.initTemplates('./templates/**/*.html', { autoescape: true });

// Render template with data
app.get('/welcome', (req, res) => {
  const result = app.renderTemplate('welcome.html', {
    title: 'Welcome',
    user: { name: 'John', email: 'john@example.com' },
    items: ['Item 1', 'Item 2', 'Item 3']
  });
  
  const parsed = JSON.parse(result);
  if (parsed.success) {
    res.html(parsed.content);
  } else {
    res.status(500).json({ error: parsed.error });
  }
});
```

### Template with Inheritance
```html
<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}{{ title }}{% endblock %}</title>
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <header>
        <h1>{% block header %}{{ header }}{% endblock %}</h1>
    </header>
    
    <main>
        {% block content %}{% endblock %}
    </main>
    
    <footer>
        <p>&copy; 2024 RNode Server</p>
    </footer>
</body>
</html>

<!-- templates/welcome.html -->
{% extends "base.html" %}

{% block title %}Welcome - {{ title }}{% endblock %}
{% block header %}Welcome, {{ user.name }}!{% endblock %}

{% block content %}
<div class="welcome-content">
    <p>Your email: {{ user.email }}</p>
    
    <h2>Items:</h2>
    <ul>
        {% for item in items %}
            <li>{{ item }}</li>
        {% endfor %}
    </ul>
    
    <p>Generated at: {{ timestamp | default(value="now") }}</p>
</div>
{% endblock %}
```

## HTTP Utilities

### Single HTTP Request
```javascript
app.get('/api/external-users', async (req, res) => {
  try {
    const response = await app.httpRequest('GET', 'https://api.example.com/users', {
      'Authorization': 'Bearer token123',
      'Accept': 'application/json'
    }, '', 10000);
    
    if (response.success) {
      res.json({
        success: true,
        users: response.body,
        status: response.status
      });
    } else {
      res.status(response.status).json({
        success: false,
        error: 'External API request failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

### Batch HTTP Requests
```javascript
app.post('/api/batch-fetch', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array required' });
    }
    
    const batchRequests = urls.map(url => ({
      method: 'GET',
      url,
      headers: { 'Accept': 'application/json' }
    }));
    
    const batchResponse = await app.httpBatch(batchRequests, 15000);
    
    if (batchResponse.success) {
      const results = batchResponse.results.map(resultStr => {
        try {
          return JSON.parse(resultStr);
        } catch {
          return { error: 'Invalid JSON response' };
        }
      });
      
      res.json({
        success: true,
        count: batchResponse.count,
        results
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Batch request failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});
```

## Advanced Middleware Patterns

### Conditional Middleware
```javascript
// Conditional middleware based on environment
const conditionalMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // Development-only middleware
    console.log(`🔍 DEV: ${req.method} ${req.url}`);
    res.setHeader('X-Dev-Mode', 'true');
  }
  
  next();
};

app.use(conditionalMiddleware);
```

### Middleware Composition
```javascript
// Compose multiple middleware functions
const compose = (...middlewares) => (req, res, next) => {
  let index = 0;
  
  const run = () => {
    if (index >= middlewares.length) {
      return next();
    }
    
    const middleware = middlewares[index++];
    middleware(req, res, run);
  };
  
  run();
};

// Use composed middleware
const authAndLogging = compose(
  (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  },
  (req, res, next) => {
    if (!req.getParam('isAuthenticated')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }
);

app.use('/api/protected', authAndLogging);
```

### Async Middleware with Error Handling
```javascript
// Async middleware wrapper
const asyncMiddleware = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database middleware
const dbMiddleware = async (req, res, next) => {
  try {
    // Simulate database connection
    const db = await connectToDatabase();
    req.setParam('db', db);
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({ error: 'Database unavailable' });
  }
};

// Use async middleware
app.use('/api', asyncMiddleware(dbMiddleware));
```

## Advanced Routing

### Dynamic Route Registration
```javascript
// Dynamic route registration based on configuration
const routes = [
  { path: '/users', method: 'GET', handler: 'getUsers' },
  { path: '/users', method: 'POST', handler: 'createUser' },
  { path: '/users/{id}', method: 'GET', handler: 'getUser' },
  { path: '/users/{id}', method: 'PUT', handler: 'updateUser' },
  { path: '/users/{id}', method: 'DELETE', handler: 'deleteUser' }
];

const handlers = {
  getUsers: (req, res) => res.json({ users: [] }),
  createUser: (req, res) => res.json({ created: true }),
  getUser: (req, res) => res.json({ id: req.params.id }),
  updateUser: (req, res) => res.json({ updated: true }),
  deleteUser: (req, res) => res.json({ deleted: true })
};

// Register routes dynamically
routes.forEach(route => {
  const handler = handlers[route.handler];
  if (handler) {
    app[route.method.toLowerCase()](route.path, handler);
  }
});
```

### Route Groups with Common Middleware
```javascript
// Create route groups with common middleware
const createRouteGroup = (prefix, middlewares = []) => {
  const router = Router();
  
  // Apply common middlewares
  middlewares.forEach(middleware => router.use(middleware));
  
  return {
    router,
    prefix,
    mount: (app) => app.useRouter(prefix, router)
  };
};

// Admin routes with auth and logging
const adminGroup = createRouteGroup('/admin', [
  (req, res, next) => {
    if (!req.getParam('isAdmin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
  (req, res, next) => {
    console.log(`🔐 Admin access: ${req.method} ${req.url}`);
    next();
  }
]);

// Add routes to admin group
adminGroup.router.get('/dashboard', (req, res) => {
  res.json({ admin: true, dashboard: 'Admin Dashboard' });
});

adminGroup.router.get('/users', (req, res) => {
  res.json({ admin: true, users: [] });
});

// Mount admin group
adminGroup.mount(app);
```

## Advanced Error Handling

### Custom Error Classes
```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
```

### Global Error Handler
```javascript
// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Handle custom errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details })
      }
    });
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.details
      }
    });
  }
  
  // Handle unknown errors
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }
  });
});
```

### Route-specific Error Handling
```javascript
// Error handling for specific routes
app.get('/api/risky-operation', async (req, res, next) => {
  try {
    // Simulate risky operation
    const result = await performRiskyOperation();
    res.json({ success: true, result });
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

// Custom error for specific route
app.get('/api/user/{id}', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await findUser(id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});
```

## Performance Optimization

### Response Caching
```javascript
const cache = new Map();

const cacheMiddleware = (ttl = 300000) => (req, res, next) => {
  const key = `${req.method}:${req.url}`;
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return res.json(cached.data);
  }
  
  // Store original res.json method
  const originalJson = res.json;
  
  // Override res.json to cache responses
  res.json = function(data) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Call original method
    originalJson.call(this, data);
  };
  
  next();
};

// Use caching middleware
app.use('/api/cacheable', cacheMiddleware(60000)); // 1 minute cache
```

### Request Rate Limiting with Redis
```javascript
// Advanced rate limiting (conceptual - implement with your Redis client)
const advancedRateLimit = (windowMs = 900000, maxRequests = 100) => {
  return async (req, res, next) => {
    const clientIP = req.getHeader('x-forwarded-for') || req.getHeader('x-real-ip') || 'unknown';
    const key = `rate_limit:${clientIP}`;
    
    try {
      // Check current count (implement with your Redis client)
      // const currentCount = await redisClient.get(key);
      
      if (currentCount >= maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Increment counter
      // await redisClient.incr(key);
      // await redisClient.expire(key, Math.ceil(windowMs / 1000));
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};

app.use('/api', advancedRateLimit(900000, 100)); // 100 requests per 15 minutes
```
