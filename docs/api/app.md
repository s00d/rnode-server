# App API

## HTTP Methods

### GET
```javascript
app.get(path, handler)
```
Register GET route handler.

### POST
```javascript
app.post(path, handler)
```
Register POST route handler.

### PUT
```javascript
app.put(path, handler)
```
Register PUT route handler.

### DELETE
```javascript
app.delete(path, handler)
```
Register DELETE route handler.

### PATCH
```javascript
app.patch(path, handler)
```
Register PATCH route handler.

### OPTIONS
```javascript
app.options(path, handler)
```
Register OPTIONS route handler.

### TRACE
```javascript
app.trace(path, handler)
```
Register TRACE route handler.

### ANY
```javascript
app.any(path, handler)
```
Register handler for any HTTP method.

## Middleware & Routing

### Global Middleware
```javascript
app.use(middleware)
```
Register global middleware for all routes.

### Route-specific Middleware
```javascript
app.use(path, middleware)
```
Register middleware for specific route path.

### Router Mounting
```javascript
app.useRouter(path, router)
```
Mount router at specific path.

## Static Files

### Basic Static Serving
```javascript
app.static(path)
```
Serve static files from directory.

### Multiple Directories
```javascript
app.static([path1, path2], options)
```
Serve static files from multiple directories.

### Static Options
```javascript
app.static('./public', {
  cache: true,
  maxAge: 3600,           // 1 hour
  maxFileSize: 10 * 1024 * 1024, // 10MB
  gzip: true,
  brotli: false, 
  zstd: false,
  lz4: false,
  allowHiddenFiles: false,
  blockedPaths: ['.git', '.env']
});
```

## File Operations

### Upload
```javascript
app.upload(path, options)
```
Register file upload route.

### Download
```javascript
app.download(path, options)
```
Register file download route.

### File Management
```javascript
app.saveFile(filename, base64Data, uploadsDir)
app.deleteFile(filename, uploadsDir)
app.listFiles(uploadsDir)
app.getFileContent(filename, uploadsDir)
app.fileExists(filename, uploadsDir)
```

## Templates

### Initialize Templates
```javascript
app.initTemplates('./templates/**/*.html', { autoescape: true });
```

### Render Template
```javascript
const result = app.renderTemplate('welcome.html', { title: 'Welcome' });
```

## HTTP Utilities

### Single Request
```javascript
const response = await app.httpRequest('GET', 'https://api.example.com/users', {
  'Authorization': 'Bearer token123'
}, '', 5000);
```

### Batch Requests
```javascript
const batchResponse = await app.httpBatch([
  { method: 'GET', url: 'https://api.example.com/users/1' },
  { method: 'POST', url: 'https://api.example.com/users', 
    body: '{"name": "John"}' }
], 10000);
```

## Server Control

### Start Server
```javascript
app.listen(port, host?, callback?)
```
Start server on specified port.

### Clear Static Cache
```javascript
app.clearStaticCache()
```

### Get Static Stats
```javascript
const stats = app.getStaticStats()
```
