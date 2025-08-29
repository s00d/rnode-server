# Examples

## Overview

Practical examples and use cases for RNode Server.

## Code Examples

- **[Middleware](./middleware.md)** - Middleware patterns and examples
- **[File Operations](./file-operations.md)** - File upload, download, and management
- **[Advanced Usage](./advanced-usage.md)** - Advanced patterns and techniques

## Quick Examples

### Basic Server
```javascript
import { createApp } from 'rnode-server';

const app = createApp();
const port = 3000;

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(port, () => {
  console.log(`🚀 Server started on port ${port}`);
});
```

### With Middleware
```javascript
// Global middleware
app.use((req, res, next) => {
  req.setParam('timestamp', Date.now());
  next();
});

// Route-specific middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
```

### Router Example
```javascript
import { Router } from 'rnode-server';

const usersRouter = Router();

usersRouter.get('/', (req, res) => {
  res.json({ users: [] });
});

usersRouter.post('/', (req, res) => {
  res.json({ created: true });
});

app.useRouter('/api/users', usersRouter);
```

### File Upload
```javascript
app.upload('/upload', {
  folder: './uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.png', '.jpg', '.pdf']
});

app.post('/upload', (req, res) => {
  if (req.hasFile('document')) {
    const file = req.getFile('document');
    res.json({ success: true, file: file.filename });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});
```

### Static Files
```javascript
app.static('./public', {
  cache: true,
  maxAge: 3600, // 1 hour
  gzip: true,
  allowHiddenFiles: false
});
```

## Common Patterns

### Authentication Middleware
```javascript
const authMiddleware = (req, res, next) => {
  const token = req.getHeader('authorization');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const user = validateToken(token);
    req.setParam('user', user);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.use('/api/protected', authMiddleware);
```

### Error Handling
```javascript
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});
```

### CORS Setup
```javascript
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
```

## Next Steps

- [Guide](../guide/) - Getting started tutorials
- [API Reference](../api/) - Complete API documentation
- [Architecture](../architecture/) - System design overview
