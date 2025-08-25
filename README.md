# RNode Server

> **🚀 Experimental Project**: This is an experimental attempt to create a high-performance Node.js server built with Rust, featuring Express-like API with advanced middleware support, authentication, and database integration.

## 🎯 **Project Overview**

RNode Server is **not just another Express.js alternative** - it's a **full-featured server implementation** built from the ground up with Rust and Node.js bindings. The goal is to create a production-ready server with all the necessary configurations for fast deployment and optimal performance.

### 🔬 **Why This Experiment?**

- **Performance**: Leverage Rust's speed and memory safety for HTTP handling
- **Node.js Integration**: Maintain familiar JavaScript/TypeScript API
- **Full Control**: Custom implementation of all server features
- **Modern Architecture**: Built with modern async patterns and efficient data structures

## ⚡ **Performance Comparison**

> **Note**: Performance tests were conducted on a personal laptop. Results may vary depending on server configuration, hardware, and environment.

| Metric                   | Express (`:4547/hello`) | RNode Server (`:4546/hello`) | Difference                          |
|--------------------------|-------------------------|------------------------------|-------------------------------------|
| **Requests/sec (RPS)**   | 9,315                   | 25,378                       | **~2.7× faster**                    |
| **Average time/request** | 10.7 ms                 | 3.9 ms                       | **~2.7× faster**                    |
| **p50 (median)**         | 10 ms                   | 4 ms                         | **~2.5× faster**                    |
| **p95**                  | 14 ms                   | 7 ms                         | **~2× faster**                      |
| **Maximum (max)**        | 18 ms                   | 13 ms                        | **Shorter tail**                    |
| **Transfer rate**        | 3.3 MB/s                | 6.6 MB/s                     | **~2× higher**                      |
| **Total transferred**    | 3.63 MB                 | 2.66 MB                      | Express sent more (headers/wrapper) |

### 🚀 **Key Performance Advantages**

- **~2.7× faster** request processing
- **~2.7× lower** average response time  
- **~2× better** transfer rates
- **Shorter latency tails** for better user experience
- **Efficient memory usage** with Rust backend

## 🏗️ **Architecture & How It Works**

### 🔄 **Request Flow Architecture**

```mermaid
sequenceDiagram
    participant Client
    participant RustBackend as Rust Backend (Axum)
    participant NodeJS as Node.js (Neon FFI)
    participant JSHandlers as JavaScript Handlers

    Client->>RustBackend: HTTP Request
    Note over RustBackend: Parse headers, body, query params
    
    RustBackend->>NodeJS: Execute JavaScript
    Note over NodeJS: Route to appropriate handler
    
    NodeJS->>JSHandlers: Run middleware & handlers
    Note over JSHandlers: Process request, generate response
    
    JSHandlers-->>NodeJS: Response data
    NodeJS-->>RustBackend: Serialized response
    
    Note over RustBackend: Format HTTP response
    RustBackend-->>Client: HTTP Response
```

### 🔄 **Data Flow Architecture**

```mermaid
flowchart TD
    A[Client Request] --> B[Rust Backend]
    B --> C{Parse Request}
    C --> D[Route to Handler]
    D --> E[Execute JavaScript]
    E --> F[Process Middleware]
    F --> G[Run Route Handler]
    G --> H[Generate Response]
    H --> I[Serialize Data]
    I --> J[Rust Response]
    J --> K[Send to Client]
    
    style B fill:#ff6b6b
    style E fill:#4ecdc4
    style J fill:#45b7d1
```

### 🧠 **Core Concept: JavaScript Execution Through Rust**

RNode Server uses a **unique hybrid approach** where **all JavaScript code execution happens through Rust backend**. This architecture provides both advantages and challenges:

#### ✅ **Advantages of This Approach**

- **🚀 Performance**: Rust handles HTTP parsing, routing, and response generation at native speed
- **🔒 Security**: Rust's memory safety prevents common server vulnerabilities
- **⚡ Efficiency**: Minimal overhead between HTTP layer and JavaScript execution
- **🔄 Control**: Full control over request/response lifecycle
- **🧩 Flexibility**: Can implement custom optimizations at any layer

#### ⚠️ **Challenges & Considerations**

- **🔄 Complexity**: JavaScript execution requires FFI (Foreign Function Interface) calls
- **📊 Memory**: Data serialization between Rust and JavaScript layers
- **🔧 Debugging**: More complex debugging across language boundaries
- **📚 Learning Curve**: Requires understanding of both Rust and Node.js ecosystems

#### 🎯 **What This Enables**

- **🚀 Custom HTTP Optimizations**: Implement protocol-level improvements
- **🔒 Advanced Security**: Rust-level security checks before JavaScript execution
- **⚡ Performance Monitoring**: Detailed metrics at every layer
- **🧩 Protocol Extensions**: Custom HTTP methods, headers, and behaviors
- **🔄 Real-time Processing**: Low-latency data transformation between layers

### 🔧 **Technical Implementation**

#### **Rust Backend (Axum)**
- **HTTP Server**: Handles all incoming HTTP requests
- **Request Parsing**: Parses headers, body, and query parameters
- **Routing**: Determines which JavaScript handler to execute
- **Response Generation**: Formats and sends HTTP responses

#### **Node.js Integration (Neon FFI)**
- **JavaScript Execution**: Runs your Express-like code
- **Data Serialization**: Converts between Rust and JavaScript data types
- **Middleware Chain**: Executes middleware and route handlers
- **Response Processing**: Handles JSON, files, and custom responses

#### **Communication Layer**
- **Zero-Copy**: Minimizes data copying between layers
- **Type Safety**: Maintains type safety across language boundaries
- **Error Handling**: Graceful error propagation between layers

### 🌟 **Why This Architecture Matters**

This isn't just another Express.js clone - it's a **fundamentally different approach** that allows you to:

- **🚀 Build faster servers** with Rust's performance
- **🔒 Implement custom security** at the protocol level
- **⚡ Create custom optimizations** for your specific use case
- **🧩 Extend HTTP protocol** with custom methods and behaviors
- **📊 Monitor performance** at every layer of your application

## ✨ Features

- 🚀 **High Performance** - Built with Rust and Node.js
- 🔧 **Express-like API** - Familiar routing and middleware
- 📁 **Static File Serving** - With compression and caching
- 📤 **File Upload** - Multipart form data support
- 📥 **File Download** - Secure file serving
- 🎨 **Template Engine** - Tera templates with inheritance
- 🔒 **HTTPS Support** - SSL/TLS encryption with certificate support
- 🌐 **IP Detection** - Client IP from various proxy headers
- 🔌 **Express Middleware** - Use existing Express plugins

## Features

- **Express-like API** - Familiar routing and middleware patterns
- **High Performance** - Rust backend with Node.js bindings
- **Template Engine** - Tera template engine integration
- **Authentication System** - Session-based auth with SQLite
- **Database Integration** - Built-in SQLite support for users and sessions
- **Static File Serving** - In-memory static file handling
- **CORS Support** - Configurable cross-origin resource sharing
- **Cookie Management** - Advanced cookie handling with helpers
- **Parameter System** - Global and route-specific parameter management
- **Router Support** - Modular routing with nested routers
- **TypeScript Support** - Full TypeScript definitions

## Installation

### Using npm
```bash
npm install rnode-server
```

### Using pnpm
```bash
pnpm add rnode-server
```

### Using yarn
```bash
yarn add rnode-server
```

## Quick Start

```javascript
import { createApp, Router } from 'rnode-server';

const app = createApp();
const port = 4546;

// Load static files into memory
app.static('./public');

// ===== CREATE USERS ROUTER =====

// Create router for users
const usersRouter = Router();

// Middleware for users router
usersRouter.use((req, res, next) => {
  console.log('👥 Users Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'users');
  next();
});

// POST route for creating a user
usersRouter.post('', (req, res) => {
  console.log('=== POST /api/users ===');
  console.log('Body:', req.body);

  try {
    // Parse body if it's JSON
    let userData = req.body;
    if (typeof req.body === 'string') {
      try {
        userData = JSON.parse(req.body);
      } catch (e) {
        userData = { name: req.body, email: '', age: null };
      }
    }

    // Check required fields
    if (!userData.name || !userData.email) {
      return res.json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Here you would typically save to your database
    // For this example, we'll just return success
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

// GET route for getting all users
usersRouter.get('', (req, res) => {
  console.log('=== GET /api/users ===');

  // Here you would typically fetch from your database
  // For this example, we'll return empty array
  res.json({ users: [] });
});

app.useRouter('/api/users', usersRouter);

app.get('/hello', (req, res) => {
  console.log('👋 Hello handler - parameters from global middleware:', req.getParams());

  // Add custom parameters
  req.setParam('handlerName', 'hello');
  req.setParam('message', 'Hello World!');

  res.json({
    message: 'Hello World!',
    globalParams: req.getParams(),
    info: 'This response contains parameters from global middleware',
    auth: {
      isAuthenticated: req.getParam('isAuthenticated'),
      user: req.getParam('user'),
      userId: req.getParam('userId')
    }
  });
});

app.get('/posts/{postId}/comments/{commentId}', (req, res) => {
  const { postId, commentId } = req.params;
  console.log('Request params:', req.params);
  res.json({ postId, commentId, message: 'Comment details' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server started on port ${port}`);
  console.log(`🔗 API endpoints:`);
  console.log(`   📝 Users:`);
  console.log(`      POST   /api/users - create user`);
  console.log(`      GET    /api/users - get all users`);
});
```

## Template Engine

RNode Server includes the Tera template engine for server-side HTML rendering. Tera is a fast, secure, and feature-rich template engine written in Rust.

### Quick Start with Templates

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
    res.setHeader('Content-Type', 'text/html');
    res.send(parsed.content);
  } else {
    res.status(500).json({ error: parsed.error });
  }
});
```

### Template Example

Create a template file `templates/welcome.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>{{ title }}</title>
</head>
<body>
    <h1>Welcome, {{ user.name }}!</h1>
    <p>Your email: {{ user.email }}</p>
    
    <h2>Items:</h2>
    <ul>
        {% for item in items %}
            <li>{{ item }}</li>
        {% endfor %}
    </ul>
    
    <p>Generated at: {{ timestamp | default(value="now") }}</p>
</body>
</html>
```

### Template Methods

- **`app.initTemplates(pattern, options)`** - Initialize Tera templates
- **`app.renderTemplate(name, context)`** - Render template with data

### Template Features

- **Variables** - `{{ variable }}`
- **Conditionals** - `{% if condition %}...{% endif %}`
- **Loops** - `{% for item in items %}...{% endfor %}`
- **Filters** - `{{ value | filter }}`
- **Macros** - `{% macro name() %}...{% endmacro %}`
- **Includes** - `{% include "partial.html" %}`
- **Inheritance** - `{% extends "base.html" %}`

For complete Tera documentation and advanced features, visit: [https://keats.github.io/tera/docs/](https://keats.github.io/tera/docs/)

## API Reference

### App Methods

#### HTTP Methods
- **`app.get(path, handler)`** - Register GET route handler
- **`app.post(path, handler)`** - Register POST route handler  
- **`app.put(path, handler)`** - Register PUT route handler
- **`app.delete(path, handler)`** - Register DELETE route handler
- **`app.patch(path, handler)`** - Register PATCH route handler
- **`app.options(path, handler)`** - Register OPTIONS route handler

#### Middleware & Routing
- **`app.use(path, middleware)`** - Register route-specific middleware
- **`app.use(middleware)`** - Register global middleware
- **`app.useRouter(path, router)`** - Mount router at specific path
- **`app.listen(port, host?, callback?)`** - Start server

#### Static Files
- **`app.static(path, options?)`** - Serve static files from directory
- **`app.static(paths[], options?)`** - Serve static files from multiple directories
- **`app.clearStaticCache()`** - Clear static files cache
- **`app.getStaticStats()`** - Get static files statistics

#### File Operations
- **`app.saveFile(filename, base64Data, uploadsDir)`** - Save file to directory
- **`app.deleteFile(filename, uploadsDir)`** - Delete file from directory
- **`app.listFiles(uploadsDir)`** - List files in directory
- **`app.getFileContent(filename, uploadsDir)`** - Get file content as base64
- **`app.fileExists(filename, uploadsDir)`** - Check if file exists
- **`app.download(path, options)`** - Register file download route
- **`app.upload(path, options)`** - Register file upload route

### Router Methods

#### HTTP Methods
- **`router.get(path, handler)`** - Register GET route handler
- **`router.post(path, handler)`** - Register POST route handler
- **`router.put(path, handler)`** - Register PUT route handler
- **`router.delete(path, handler)`** - Register DELETE route handler
- **`router.patch(path, handler)`** - Register PATCH route handler
- **`router.options(path, handler)`** - Register OPTIONS route handler

#### Middleware
- **`router.use(path, middleware)`** - Register route-specific middleware
- **`router.use(middleware)`** - Register global middleware for router
- **`router.getHandlers()`** - Get all registered handlers
- **`router.getMiddlewares()`** - Get all registered middlewares

### Request Object Methods

#### Parameter Management
- **`req.setParam(name, value)`** - Set custom parameter
- **`req.getParam(name)`** - Get custom parameter value
- **`req.hasParam(name)`** - Check if parameter exists
- **`req.getParams()`** - Get all custom parameters

#### File Handling
- **`req.getFile(fieldName)`** - Get uploaded file by field name
- **`req.getFiles()`** - Get all uploaded files
- **`req.hasFile(fieldName)`** - Check if file exists
- **`req.getFileCount()`** - Get number of uploaded files

#### Headers & Cookies
- **`req.getHeader(name)`** - Get request header value
- **`req.hasHeader(name)`** - Check if header exists
- **`req.getHeaders()`** - Get all request headers
- **`req.getCookie(name)`** - Get cookie value by name
- **`req.hasCookie(name)`** - Check if cookie exists
- **`req.getCookies()`** - Get all cookies as object

#### Request Properties
- **`req.method`** - HTTP method
- **`req.url`** - Request URL
- **`req.params`** - Route parameters
- **`req.query`** - Query string parameters
- **`req.body`** - Request body
- **`req.files`** - Uploaded files
- **`req.contentType`** - Content-Type header
- **`req.headers`** - Request headers
- **`req.cookies`** - Request cookies

### Response Object Methods

#### HTTP Response
- **`res.status(code)`** - Set HTTP status code
- **`res.setHeader(name, value)`** - Set response header
- **`res.getHeader(name)`** - Get response header
- **`res.getHeaders()`** - Get all response headers

#### Content Types
- **`res.json(data)`** - Send JSON response
- **`res.html(content)`** - Send HTML response
- **`res.text(content)`** - Send plain text response
- **`res.xml(content)`** - Send XML response
- **`res.send(data)`** - Send generic response
- **`res.end(data?)`** - End response

#### File Operations
- **`res.sendFile(file)`** - Send uploaded file
- **`res.sendFiles(files)`** - Send multiple files
- **`res.sendBuffer(buffer, contentType?, size?)`** - Send binary data
- **`res.sendMultipart(data)`** - Send multipart data
- **`res.download(filepath, filename?)`** - Trigger file download
- **`res.attachment(filename?)`** - Set attachment header

#### Redirects
- **`res.redirect(url, status?)`** - Redirect to URL

#### Cookies
- **`res.setCookie(name, value, options?)`** - Set response cookie
- **`res.getCookie(name)`** - Get response cookie
- **`res.getCookies()`** - Get all response cookies

### Static File Options

- **`cache`** - Enable file caching (default: true)
- **`maxAge`** - Cache lifetime in seconds (default: 3600)
- **`maxFileSize`** - Maximum file size in bytes (default: 10MB)
- **`etag`** - Generate ETag headers (default: true)
- **`lastModified`** - Add Last-Modified headers (default: true)
- **`gzip`** - Enable Gzip compression (default: true)
- **`brotli`** - Enable Brotli compression (default: false)
- **`allowHiddenFiles`** - Allow hidden files (default: false)
- **`allowSystemFiles`** - Allow system files (default: false)
- **`allowedExtensions`** - Whitelist file extensions
- **`blockedPaths`** - Block specific paths

### Upload Options

- **`folder`** - Upload directory path
- **`allowedSubfolders`** - Allowed subfolder patterns (supports wildcards)
- **`maxFileSize`** - Maximum file size in bytes
- **`allowedExtensions`** - Allowed file extensions
- **`allowedMimeTypes`** - Allowed MIME types
- **`multiple`** - Allow multiple file uploads
- **`maxFiles`** - Maximum number of files
- **`overwrite`** - Allow overwriting existing files

### Download Options

- **`folder`** - Directory to serve files from
- **`maxFileSize`** - Maximum file size in bytes
- **`allowedExtensions`** - Allowed file extensions
- **`blockedPaths`** - Blocked file paths
- **`allowHiddenFiles`** - Allow hidden files
- **`allowSystemFiles`** - Allow system files

## Code Examples

### Basic Server Setup
```javascript
import { createApp } from 'rnode-server';

const app = createApp();
const port = 3000;

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
import { Router } from 'rnode-server';

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
```typescript
// Basic static file serving
app.static('./public');

// Multiple directories with different settings
app.static(['./images', './icons'], {
  cache: true,
  maxAge: 86400,         // 24 hours
  maxFileSize: 10 * 1024 * 1024, // 10MB
  gzip: false,           // Images are already compressed
  brotli: false
});

// Full configuration example
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
```

### File Upload & Multipart Forms

#### Simple Upload Example
```typescript
// Single file upload
app.post('/upload', (req, res) => {
  if (req.hasFile('avatar')) {
    const file = req.getFile('avatar');
    console.log(`File: ${file.filename}, size: ${file.size} bytes`);
    
    res.json({
      message: 'File uploaded successfully',
      file: {
        name: file.filename,
        size: file.size,
        type: file.contentType
      }
    });
  } else {
    res.status(400).json({ error: 'File not found' });
  }
});

// Multiple file upload
app.post('/upload-multiple', (req, res) => {
  const files = req.getFiles();
  const fileCount = req.getFileCount();
  
  if (fileCount > 0) {
    // Send information about all files
    res.sendFiles(files);
  } else {
    res.status(400).text('Files not found');
  }
});
```

#### Advanced Upload with Wildcard Routes
```typescript
// Upload to specific subfolder with wildcard support
app.upload('/upload/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['documents/*', 'images/*', 'files/*'], // Wildcard patterns
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
  multiple: false,
  overwrite: true
});

// Multiple file upload to any subfolder
app.upload('/upload-multiple/{*subfolder}', {
  folder: './uploads',
  allowedSubfolders: ['*'], // Allow any subfolder
  maxFileSize: 50 * 1024 * 1024,
  multiple: true,
  maxFiles: 10,
  overwrite: true
});
```

### Route Parameters and Wildcards

#### Named Parameters
```typescript
// Basic named parameter (colon syntax)
app.get('/users/{id}', (req, res) => {
  const userId = req.params.id;
  res.json({ userId, message: 'User details' });
});

// Named parameters in curly braces (modern syntax)
app.get('/posts/{postId}/comments/{commentId}', (req, res) => {
  const { postId, commentId } = req.params;
  res.json({ postId, commentId, message: 'Comment details' });
});
```

#### Wildcard Parameters
```typescript
// Wildcard for file paths
app.get('/files/{*filepath}', (req, res) => {
  const filepath = req.params.filepath;
  // filepath can be: "documents/report.pdf", "images/photo.jpg", etc.
  res.json({ filepath, message: 'File path captured' });
});

// Wildcard for subfolder uploads
app.post('/upload/{*subfolder}', (req, res) => {
  const subfolder = req.params.subfolder;
  // subfolder can be: "documents", "documents/2024", "documents/2024/january", etc.
  res.json({ subfolder, message: 'Upload to subfolder' });
});
```

#### Query Parameters
```typescript
// Access query parameters
app.get('/search', (req, res) => {
  const { q, page, limit } = req.query;
  res.json({ 
    query: q, 
    page: parseInt(page) || 1, 
    limit: parseInt(limit) || 10 
  });
});
```


## Configuration

RNode Server supports various configuration options for SSL/TLS encryption and logging levels:

```typescript
import { createApp } from 'rnode-server';

// Create app with configuration options
const app = createApp({ 
  // SSL configuration (optional)
  ssl: { 
    certPath: './ssl/server.crt', 
    keyPath: './ssl/server.key' 
  },
  // Log level: 'trace', 'debug', 'info', 'warn', 'error' (default: 'info')
  // Higher levels include lower levels (e.g., 'info' shows info, warn, and error)
  logLevel: 'debug' 
});

// Start server (will use HTTPS if SSL is configured)
app.listen(3000, '127.0.0.1');
```

#### SSL Certificate Generation

```bash
# Generate self-signed certificates
cd playground
pnpm run ssl:generate

# Or manually with OpenSSL
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Server Capabilities

### HTTP Methods Support
- GET, POST, PUT, DELETE, PATCH requests
- Dynamic route parameters (`/users/{id}`, `/posts/{postId}`)
- Wildcard parameters (`/files/{*filepath}`)
- Query string parsing
- Request body parsing (JSON, form data, multipart/form-data)
- File upload support with Base64 encoding
- Multiple file upload handling

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
- **Advanced Configuration**: Multiple folders with different settings
- **Smart Caching**: In-memory caching with configurable TTL
- **Compression**: Automatic Gzip and Brotli compression
- **Security**: Hidden files, system files, and dangerous paths blocked by default
- **Performance**: Pre-computed headers and compressed content
- **Universal**: Works with any folder structure, auto-serves `index.html` for directories
- **File Limits**: Configurable maximum file sizes
- **HTTP Headers**: ETag, Last-Modified, Cache-Control support

### CORS & Headers
- **CORS Support** - Implement CORS policies through middleware
- **Custom Headers** - Set custom response headers
- **Security Headers** - Add security headers for XSS and CSRF protection
- **Preflight Handling** - Handle OPTIONS preflight requests

#### CORS Middleware Example
```javascript
app.use('/api', (req, res, next) => {
  console.log('🌐 CORS middleware for API:', req.method, req.url);

  // Allow all origins (can be restricted for production)
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Allow all methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  // Allow all headers
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Custom-Header');

  // Allow credentials (cookies, authorization headers)
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Maximum preflight request caching time
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Set Content-Type with encoding for all API responses
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Additional headers for better compatibility
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    // Send empty JSON response instead of res.end()
    res.json({ success: true, message: 'Preflight OK' });
    return;
  }

  // Continue execution for other requests
  next();
});
```

#### Rate Limiting Middleware Example
```javascript
// Simple in-memory rate limiting (use Redis for production)
const rateLimitStore = new Map();

app.use('/api', (req, res, next) => {
  const clientIP = req.getHeader('x-forwarded-for') || req.getHeader('x-real-ip') || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // max 100 requests per window

  // Get client data from store
  let clientData = rateLimitStore.get(clientIP);
  
  if (!clientData) {
    clientData = { requests: [], resetTime: now + windowMs };
    rateLimitStore.set(clientIP, clientData);
  }

  // Clean old requests outside the window
  clientData.requests = clientData.requests.filter(time => time > now - windowMs);

  // Check if limit exceeded
  if (clientData.requests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Try again later.',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }

  // Add current request
  clientData.requests.push(now);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', maxRequests - clientData.requests.length);
  res.setHeader('X-RateLimit-Reset', clientData.resetTime);

  next();
});

// Clean up expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 60 * 1000);
```

#### Security Headers Middleware Example
```javascript
app.use((req, res, next) => {
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (HTTPS Strict Transport Security)
  if (req.getHeader('x-forwarded-proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});
```

#### Session Management Middleware Example
```javascript
// Global middleware for session management
app.use((req, res, next) => {
  // Set request ID and timestamp
  req.setParam('requestId', Math.random().toString(36).substr(2, 9));
  req.setParam('timestamp', Date.now());

  // Get session ID from cookies
  const sessionId = req.getCookie('sessionId');
  
  if (sessionId) {
    // Here you would validate the session against your database/Redis
    // For this example, we'll use a simple validation
    try {
      // Validate session (replace with your session validation logic)
      const sessionData = validateSession(sessionId);
      
      if (sessionData) {
        req.setParam('userId', sessionData.userId);
        req.setParam('user', sessionData.user);
        req.setParam('isAuthenticated', true);
        req.setParam('sessionId', sessionId);
      } else {
        req.setParam('isAuthenticated', false);
        // Clear invalid session cookie
        res.setCookie('sessionId', '', { maxAge: 0, path: '/' });
      }
    } catch (error) {
      console.error('Session validation error:', error);
      req.setParam('isAuthenticated', false);
      res.setCookie('sessionId', '', { maxAge: 0, path: '/' });
    }
  } else {
    req.setParam('isAuthenticated', false);
  }

  next();
});

// Authentication middleware for protected routes
app.use('/api/protected', (req, res, next) => {
  if (!req.getParam('isAuthenticated')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'Unauthorized'
    });
  }
  
  next();
});

// Helper function for session validation (replace with your implementation)
function validateSession(sessionId) {
  // This is a placeholder - implement your session validation logic
  // You might check against Redis, database, or JWT token
  
  // Example Redis check:
  // return redisClient.get(`session:${sessionId}`);
  
  // Example database check:
  // return db.query('SELECT * FROM sessions WHERE id = ? AND expires_at > NOW()', [sessionId]);
  
  // For demo purposes, return mock data
  if (sessionId && sessionId.length > 10) {
    return {
      userId: 'user123',
      user: { username: 'demo_user', email: 'demo@example.com' }
    };
  }
  
  return null;
}
```

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

### Response Types
- **JSON responses** - `res.json(data)`
- **HTML content** - `res.html(content)` 
- **Plain text** - `res.text(content)`
- **XML content** - `res.xml(content)`
- **File downloads** - `res.download(filepath, filename)`
- **File attachments** - `res.attachment(filename)`
- **Redirects** - `res.redirect(url)`
- **File uploads** - `res.sendFile(file)`, `res.sendFiles(files)`
- **Multipart data** - `res.sendMultipart(data)`

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
