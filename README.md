# RNode Server

A high-performance HTTP server built with Rust and Node.js, featuring Express-like API with advanced middleware support, authentication, and database integration.

## Features

- **Express-like API** - Familiar routing and middleware patterns
- **High Performance** - Rust backend with Node.js bindings
- **Authentication System** - Session-based auth with SQLite
- **Database Integration** - Built-in SQLite support for users and sessions
- **Static File Serving** - In-memory static file handling
- **CORS Support** - Configurable cross-origin resource sharing
- **Cookie Management** - Advanced cookie handling with helpers
- **Parameter System** - Global and route-specific parameter management
- **Router Support** - Modular routing with nested routers
- **TypeScript Support** - Full TypeScript definitions

## Quick Start

```bash
# Install dependencies
npm install

# Build Rust backend
npm run build

# Run demo server
cd playground
npm run start
```

Server will start on port 4546.

## Demo Examples

All demo examples are located in the `playground/` directory:

### From playground directory
```bash
cd playground

# Run main RNode server demo
npm run start

# Run TypeScript RNode demo
npm run start:rnode

# Run Express.js comparison demo
npm run start:express

# Development mode with auto-restart
npm run dev
npm run dev:rnode
npm run dev:express

# Build TypeScript
npm run build
npm run build:watch
```

### From root directory (using pnpm workspace)
```bash
# Run playground demos
pnpm playground:start
pnpm playground:rnode
pnpm playground:express

# Development mode
pnpm playground:dev
pnpm playground:dev:rnode
pnpm playground:dev:express

# Build playground
pnpm playground:build
pnpm playground:build:watch
```

## Code Examples

### Basic Server Setup
```javascript
import { createApp, Router } from './lib/index.cjs';

const app = createApp();
const port = 4546;

// Simple route
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

### Middleware Usage
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

### Router System
```javascript
const userRouter = Router();

userRouter.get('/', (req, res) => {
  res.json({ users: [] });
});

userRouter.post('/', (req, res) => {
  res.json({ created: true });
});

app.useRouter('/api/users', userRouter);
```

### Authentication
```javascript
app.use('/api/auth', (req, res, next) => {
  if (!req.getParam('isAuthenticated')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Static Files
```javascript
// Serve static files from directory
app.static('./public');
```

### Host Binding
```javascript
// Bind to specific host
app.listen(port, '0.0.0.0', () => {
  console.log('Server running on all interfaces');
});

// Bind to localhost (default)
app.listen(port, () => {
  console.log('Server running on localhost');
});
```

## Server Capabilities

### HTTP Methods Support
- GET, POST, PUT, DELETE, PATCH requests
- Dynamic route parameters (`/users/:id`)
- Query string parsing
- Request body parsing (JSON, form data)

### Middleware System
- Global middleware for all routes
- Route-specific middleware
- Chained middleware execution
- Custom middleware creation

### Authentication & Security
- Session-based authentication
- Password hashing and validation
- Protected route middleware
- Cookie-based session management
- Automatic session cleanup

### Database Features
- SQLite database integration
- User management (CRUD operations)
- Session storage and validation
- Search and filtering capabilities

### Static File Handling
- In-memory file serving
- Automatic MIME type detection
- File caching for performance
- Directory-based file organization

### CORS & Headers
- Configurable CORS policies
- Custom header management
- Preflight request handling
- Security headers (XSS, CSRF protection)

### Cookie Management
- Secure cookie setting
- HttpOnly and Secure flags
- Expiration and path control
- Cookie validation helpers

### Parameter System
- Global parameter sharing across middleware
- Route-specific parameters
- Parameter validation and type checking
- Cross-request parameter persistence

### Router System
- Nested router support
- Route grouping and organization
- Middleware inheritance
- Modular application structure

### Error Handling
- Custom error responses
- Status code management
- Error logging and debugging
- Graceful error recovery

### Performance Features
- Async request processing
- Non-blocking I/O operations
- Memory-efficient static file serving
- Optimized database queries

## Architecture

- **Rust Backend** - High-performance HTTP server with Axum
- **Node.js Bindings** - Neon-based FFI for JavaScript integration
- **Modular Design** - Separated concerns in different modules
- **Global State** - Thread-safe shared state management
- **Event System** - Inter-thread communication via channels

## Development

### Building
```bash
# Build Rust backend
npm run build

# Watch mode
npm run build:watch
```

### Testing
```bash
# Test endpoints
curl http://localhost:4546/hello
curl http://localhost:4546/api/users
```

## License

MIT License
