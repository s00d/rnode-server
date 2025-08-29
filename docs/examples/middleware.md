# Middleware Examples

## Global Middleware

### Logging Middleware
```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// Global logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  console.log(`${req.method} ${req.url} - Started`);
  
  // Add response listener
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});
```

### Authentication Middleware
```javascript
// Global auth middleware
app.use((req, res, next) => {
  const token = req.getHeader('authorization');
  
  if (!token) {
    req.setParam('isAuthenticated', false);
    return next();
  }
  
  try {
    // Validate token (replace with your logic)
    const user = validateToken(token);
    req.setParam('isAuthenticated', true);
    req.setParam('user', user);
    next();
  } catch (error) {
    req.setParam('isAuthenticated', false);
    next();
  }
});

// Protected route
app.get('/api/profile', (req, res) => {
  if (!req.getParam('isAuthenticated')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const user = req.getParam('user');
  res.json({ profile: user });
});
```

## Route-specific Middleware

### CORS Middleware
```javascript
// CORS middleware for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.json({ success: true, message: 'Preflight OK' });
    return;
  }
  
  next();
});

// API routes
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});
```

### Rate Limiting
```javascript
const rateLimitStore = new Map();

app.use('/api', (req, res, next) => {
  const clientIP = req.getHeader('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;
  
  let clientData = rateLimitStore.get(clientIP);
  
  if (!clientData) {
    clientData = { requests: [], resetTime: now + windowMs };
    rateLimitStore.set(clientIP, clientData);
  }
  
  // Clean old requests
  clientData.requests = clientData.requests.filter(time => time > now - windowMs);
  
  if (clientData.requests.length >= maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }
  
  clientData.requests.push(now);
  next();
});
```

## Router Middleware

### Router-specific Middleware
```javascript
import { Router } from 'rnode-server';

const usersRouter = Router();

// Middleware for users router
usersRouter.use((req, res, next) => {
  console.log('👥 Users Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'users');
  next();
});

// Auth middleware for specific routes
usersRouter.use('/profile', (req, res, next) => {
  if (!req.getParam('isAuthenticated')) {
    return res.status(401).json({ error: 'Login required' });
  }
  next();
});

usersRouter.get('/', (req, res) => {
  res.json({ users: [], router: req.getParam('routerName') });
});

usersRouter.get('/profile', (req, res) => {
  const user = req.getParam('user');
  res.json({ profile: user });
});

app.useRouter('/api/users', usersRouter);
```

## Error Handling Middleware

### Global Error Handler
```javascript
// Error handling middleware (must be last)
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});
```

### Async Error Handler
```javascript
// Wrapper for async handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Use with async handlers
app.get('/api/async', asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```
