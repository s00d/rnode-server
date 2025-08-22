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

# Run static files demo  
npm run start:static

# Run multipart upload demo
npm run start:multipart

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
pnpm playground:static
pnpm playground:multipart
pnpm playground:express

# Development mode
pnpm playground:dev
pnpm playground:dev:rnode
pnpm playground:dev:static
pnpm playground:dev:multipart
pnpm playground:dev:express

# Build playground
pnpm playground:build
pnpm playground:build:watch
```

## Demo Applications

### Multipart Upload Demo (`playground/src/multipart_example.ts`)
Complete file upload application demonstrating advanced multipart handling:

- **Wildcard Routes**: Upload to any subfolder using `{*subfolder}` patterns
- **File Management**: Upload, download, list, and delete files with subfolder support
- **Security**: Configurable file size limits, allowed extensions, and MIME types
- **Web Interface**: Built-in HTML forms for single and multiple file uploads
- **File Operations**: Rust backend methods for file system operations
- **Subfolder Support**: Organize files in nested directory structures

**Features:**
- Single file upload with subfolder selection
- Multiple file upload (up to 10 files)
- Wildcard subfolder patterns (`documents/*`, `images/*`, `files/*`)
- File listing with folder hierarchy
- File download from any subfolder
- File deletion with path support
- Static file serving for web interface

**Usage:**
```bash
cd playground
npm run start:multipart
# Server runs on http://localhost:4540
# Web interface: http://localhost:4540
# Upload files to: http://localhost:4540/upload
# Download files from: http://localhost:4540/download/{*name}
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

#### Basic Options
- `cache: boolean` - Enable file caching (default: `true`)
- `maxAge: number` - Cache lifetime in seconds (default: `3600`)

#### File Size Limits
- `maxFileSize: number` - Maximum file size in bytes (default: `10MB`)

#### HTTP Headers
- `etag: boolean` - Generate ETag headers (default: `true`)
- `lastModified: boolean` - Add Last-Modified headers (default: `true`)
####
### Compression
- `gzip: boolean` - Enable Gzip compression (default: `true`)
- `brotli: boolean` - Enable Brotli compression (default: `false`)

####### Security Options
- `allowHiddenFiles: boolean` - Allow hidden files (default: `false`)
- `allowSystemFiles: boolean` - Allow system files (default: `false`)
- `allowedExtensions: string[]` - Whitelist file extensions (default: `['html', 'css', 'js', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot']`)
- `blockedPaths: string[]` - Block specific paths (default: `['.git', '.env', '.htaccess', 'thumbs.db', '.ds_store', 'desktop.ini']`)


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

#### Frontend Upload Example (HTML + JavaScript)
```html
<!-- Simple file upload form -->
<form id="uploadForm" enctype="multipart/form-data">
  <input type="file" name="avatar" accept="image/*" required>
  <select name="subfolder" id="subfolderSelect">
    <option value="">Root folder</option>
    <option value="documents">Documents</option>
    <option value="images">Images</option>
    <option value="documents/2024">Documents/2024</option>
  </select>
  <button type="submit">Upload File</button>
</form>

<div id="results"></div>
```

```javascript
// JavaScript for handling file upload
document.getElementById('uploadForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const subfolder = document.getElementById('subfolderSelect').value;
  
  // Add subfolder to form data if selected
  if (subfolder) {
    formData.append('subfolder', subfolder);
  }
  
  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      const uploadedFiles = result.uploadedFiles || [];
      const totalFiles = result.totalFiles || 0;
      
      // Display upload results
      let resultHtml = `
        <div class="result success">
          <h3>✅ File uploaded successfully</h3>
          <p><strong>Files uploaded:</strong> ${totalFiles}</p>
          <p><strong>Subfolder:</strong> ${subfolder || 'Root folder'}</p>
          
          <h4>Uploaded files:</h4>
          <div class="uploaded-files">`;
      
      uploadedFiles.forEach(file => {
        resultHtml += `
          <div class="file-details">
            <p><strong>Name:</strong> ${file.name}</p>
            <p><strong>Size:</strong> ${file.size} bytes</p>
            <p><strong>Type:</strong> ${file.mime_type}</p>
            <p><strong>Path:</strong> ${file.relative_path}</p>
          </div>`;
      });
      
      resultHtml += `
          </div>
        </div>`;
      
      document.getElementById('results').innerHTML = resultHtml;
    } else {
      document.getElementById('results').innerHTML = 
        `<div class="result error">❌ Upload failed: ${result.error}</div>`;
    }
  } catch (error) {
    document.getElementById('results').innerHTML = 
      `<div class="result error">❌ Network error: ${error.message}</div>`;
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

#### File Download with Wildcard Routes
```typescript
// Download files from any subfolder
app.download('/download/{*name}', {
  folder: './uploads',
  maxFileSize: 100 * 1024 * 1024, // 100 MB
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.docx'],
  allowHiddenFiles: false,
  allowSystemFiles: false
});
```

#### Content Type Responses
```typescript
app.get('/page', (req, res) => {
  res.html('<h1>HTML Page</h1><p>Content</p>');
});

app.get('/data.xml', (req, res) => {
  res.xml('<?xml version="1.0"?><data><item>value</item></data>');
});

app.get('/redirect', (req, res) => {
  res.redirect('/new-location');
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

// Mixed syntax is also supported
app.get('/articles/{articleId}/reviews/{reviewId}', (req, res) => {
  const { articleId, reviewId } = req.params;
  res.json({ articleId, reviewId, message: 'Review details' });
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

// Wildcard for downloads
app.get('/download/{*name}', (req, res) => {
  const filename = req.params.name;
  // filename can be: "report.pdf", "documents/report.pdf", "documents/2024/report.pdf", etc.
  res.download(`./uploads/${filename}`);
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

// Upload with query parameter for subfolder
app.post('/upload', (req, res) => {
  const subfolder = req.query.dir; // ?dir=documents/2024
  // Use subfolder for file organization
  res.json({ subfolder, message: 'Upload completed' });
});
```

## Server Capabilities

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
