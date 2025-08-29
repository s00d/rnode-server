# Playground Examples

## Overview

The project includes a comprehensive playground with real examples demonstrating all features of RNode Server.

## Getting Started

### Setup Playground
```bash
cd playground
pnpm install
pnpm run dev:mini  # Start development server
```

Visit `http://localhost:4599` to explore all examples.

## Main Application

### Playground Structure
```
playground/
├── src/
│   ├── index.ts              # Main application entry point
│   └── routers/              # Router examples
│       ├── api.ts            # Basic API endpoints
│       ├── auth_api.ts       # Authentication system
│       ├── common.ts         # Common middleware
│       ├── cors.ts           # CORS configuration
│       ├── multipart.ts      # File upload handling
│       ├── static.ts         # Static file serving
│       ├── templates.ts      # Template engine usage
│       └── users.ts          # User management
├── public/                   # Static files
├── templates/                # HTML templates
├── uploads/                  # File upload directory
└── ssl/                      # SSL certificates
```

### Main Application Features
- **HTTP & HTTPS servers** with SSL configuration
- **Router integration** with multiple API endpoints
- **File upload/download** with wildcard subfolder support
- **Static file serving** with security options
- **Middleware integration** for logging and CORS

## Router Examples

### Basic API Router (`api.ts`)
```typescript
// Basic API endpoints and CRUD operations
const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.get('/info', (req, res) => {
  res.json({
    version: '1.0.0',
    features: ['routing', 'middleware', 'templates', 'file-ops']
  });
});

app.useRouter('/api', apiRouter);
```

### Authentication Router (`auth_api.ts`)
```typescript
// Authentication system with sessions
const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (validateCredentials(username, password)) {
    const sessionId = generateSessionId();
    
    res.setCookie('sessionId', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 // 24 hours
    });
    
    res.json({ success: true, message: 'Logged in successfully' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

authRouter.post('/logout', (req, res) => {
  res.removeCookie('sessionId');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.useRouter('/auth', authRouter);
```

### CORS Router (`cors.ts`)
```typescript
// CORS configuration and preflight handling
const corsRouter = Router();

corsRouter.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.json({ success: true, message: 'Preflight OK' });
    return;
  }
  
  next();
});

corsRouter.get('/data', (req, res) => {
  res.json({ message: 'CORS-enabled endpoint', data: [1, 2, 3] });
});

app.useRouter('/cors', corsRouter);
```

### File Upload Router (`multipart.ts`)
```typescript
// File upload and multipart form handling
const multipartRouter = Router();

// Single file upload
app.upload('/upload', {
  folder: './uploads',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.png', '.jpg', '.pdf', '.txt']
});

multipartRouter.post('/upload', (req, res) => {
  if (req.hasFile('document')) {
    const file = req.getFile('document');
    res.json({
      success: true,
      file: {
        name: file.filename,
        size: file.size,
        type: file.contentType
      }
    });
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});

// Multiple file upload
app.upload('/upload-multiple', {
  folder: './uploads',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedExtensions: ['.png', '.jpg', '.pdf', '.docx'],
  multiple: true,
  maxFiles: 10
});

multipartRouter.post('/upload-multiple', (req, res) => {
  const files = req.getFiles();
  const fileCount = req.getFileCount();
  
  if (fileCount > 0) {
    res.json({
      success: true,
      files: files.map(file => ({
        name: file.filename,
        size: file.size,
        type: file.contentType
      })),
      count: fileCount
    });
  } else {
    res.status(400).json({ error: 'No files uploaded' });
  }
});

app.useRouter('/multipart', multipartRouter);
```

### Static Files Router (`static.ts`)
```typescript
// Static file serving examples
const staticRouter = Router();

// Basic static files
app.static('./public');

// Multiple directories with different settings
app.static(['./images', './icons'], {
  cache: true,
  maxAge: 86400,         // 24 hours
  maxFileSize: 10 * 1024 * 1024, // 10MB
  gzip: false,           // Images are already compressed
  brotli: false
});

// Admin area with restricted access
app.static('./admin', {
  cache: true,
  maxAge: 1800, // 30 minutes
  maxFileSize: 5 * 1024 * 1024, // 5MB
  etag: true,
  lastModified: true,
  gzip: true,
  brotli: true,
  allowHiddenFiles: false,
  allowSystemFiles: false,
  allowedExtensions: ['html', 'css', 'js'],
  blockedPaths: ['.git', '.env', '.htaccess', 'thumbs.db']
});

staticRouter.get('/stats', (req, res) => {
  const stats = app.getStaticStats();
  res.json({ success: true, stats });
});

app.useRouter('/static', staticRouter);
```

### Templates Router (`templates.ts`)
```typescript
// Template engine usage examples
const templatesRouter = Router();

// Initialize Tera templates
app.initTemplates('./templates/**/*.html', { autoescape: true });

templatesRouter.get('/welcome', (req, res) => {
  const result = app.renderTemplate('welcome.html', {
    title: 'Welcome to Playground',
    user: { name: 'Visitor', email: 'visitor@example.com' },
    items: ['Feature 1', 'Feature 2', 'Feature 3']
  });
  
  const parsed = JSON.parse(result);
  if (parsed.success) {
    res.html(parsed.content);
  } else {
    res.status(500).json({ error: parsed.error });
  }
});

templatesRouter.get('/dashboard', (req, res) => {
  const result = app.renderTemplate('dashboard.html', {
    title: 'Dashboard',
    stats: {
      users: 42,
      posts: 128,
      views: 1024
    }
  });
  
  const parsed = JSON.parse(result);
  if (parsed.success) {
    res.html(parsed.content);
  } else {
    res.status(500).json({ error: parsed.error });
  }
});

app.useRouter('/templates', templatesRouter);
```

### Users Router (`users.ts`)
```typescript
// User management and database operations
const usersRouter = Router();

// Middleware for users router
usersRouter.use((req, res, next) => {
  console.log('👥 Users Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'users');
  next();
});

// Create user
usersRouter.post('', (req, res) => {
  console.log('=== POST /api/users ===');
  console.log('Body:', req.body);

  try {
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        userData = { name: req.body, email: '', age: null };
      }
    }

    if (!userData.name || !userData.email) {
      return res.json({
        success: false,
        message: 'Name and email are required'
      });
    }

    res.json({
      success: true,
      message: 'User created successfully',
      userId: Date.now(),
      user: userData
    });
  } catch (error) {
    res.json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});

// Get all users
usersRouter.get('', (req, res) => {
  console.log('=== GET /api/users ===');
  res.json({ users: [] });
});

// Get user by ID
usersRouter.get('/{id}', (req, res) => {
  const { id } = req.params;
  res.json({ userId: id, message: 'User details' });
});

app.useRouter('/api/users', usersRouter);
```

## Common Middleware

### Logging Middleware
```typescript
// Common middleware and utilities
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
```

### Authentication Middleware
```typescript
app.use('/api/protected', (req, res, next) => {
  const sessionId = req.getCookie('sessionId');
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Validate session (simplified)
  if (sessionId.length > 10) {
    req.setParam('isAuthenticated', true);
    req.setParam('userId', 'user123');
    next();
  } else {
    res.status(401).json({ error: 'Invalid session' });
  }
});
```

## SSL Configuration

### Generate SSL Certificates
```bash
cd playground
pnpm run ssl:generate
```

### SSL Configuration
```typescript
const app = createApp({
  ssl: {
    certPath: './ssl/server.crt',
    keyPath: './ssl/server.key'
  }
});
```

## Available Endpoints

### API Endpoints
- `GET /api/health` - Health check
- `GET /api/info` - Server information
- `POST /api/users` - Create user
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get user by ID

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### File Operations
- `POST /multipart/upload` - Single file upload
- `POST /multipart/upload-multiple` - Multiple file upload

### Templates
- `GET /templates/welcome` - Welcome template
- `GET /templates/dashboard` - Dashboard template

### CORS
- `GET /cors/data` - CORS-enabled endpoint

### Static Files
- `GET /static/*` - Static file serving
- `GET /static/stats` - Static file statistics

## Testing Examples

### Test File Upload
```bash
# Test single file upload
curl -X POST -F "document=@test.txt" http://localhost:4599/multipart/upload

# Test multiple file upload
curl -X POST -F "documents=@file1.txt" -F "documents=@file2.txt" \
  http://localhost:4599/multipart/upload-multiple
```

### Test API Endpoints
```bash
# Create user
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}' \
  http://localhost:4599/api/users

# Get users
curl http://localhost:4599/api/users

# Health check
curl http://localhost:4599/api/health
```

### Test Templates
```bash
# Welcome template
curl http://localhost:4599/templates/welcome

# Dashboard template
curl http://localhost:4599/templates/dashboard
```

## Next Steps

- [Middleware Examples](./middleware.md) - Middleware patterns
- [File Operations](./file-operations.md) - File handling examples
- [Advanced Usage](./advanced-usage.md) - Advanced patterns
- [API Reference](../api/) - Complete API documentation
