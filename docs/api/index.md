# API Reference

## Overview

Complete API reference for RNode Server with examples and usage patterns.

## Core APIs

- **[App](./app.md)** - Main application methods and configuration
- **[Router](./router.md)** - Router creation and management
- **[Request](./request.md)** - Request object properties and methods
- **[Response](./response.md)** - Response object methods and options

## Quick Reference

### App Methods
```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// HTTP Methods
app.get(path, handler)
app.post(path, handler)
app.put(path, handler)
app.delete(path, handler)

// Middleware
app.use(middleware)
app.use(path, middleware)

// Static Files
app.static(path, options?)

// File Operations
app.upload(path, options)
app.download(path, options)

// Templates
app.initTemplates(pattern, options)
app.renderTemplate(name, context)

// HTTP Utilities
app.httpRequest(method, url, headers, body, timeout)
app.httpBatch(requests, timeout)
```

### Router Methods
```javascript
import { Router } from 'rnode-server';

const router = Router();

// HTTP Methods
router.get(path, handler)
router.post(path, handler)
router.put(path, handler)
router.delete(path, handler)

// Middleware
router.use(middleware)
router.use(path, middleware)
```

### Request Object
```javascript
// Properties
req.method        // HTTP method
req.url           // Request URL
req.params        // Route parameters
req.query         // Query parameters
req.body          // Request body
req.files         // Uploaded files

// Methods
req.setParam(name, value)
req.getParam(name)
req.getBodyAsJson()
req.getFile(fieldName)
```

### Response Object
```javascript
// Content Types
res.json(data)
res.html(content)
res.text(content)
res.xml(content)

// Headers & Status
res.status(code)
res.setHeader(name, value)

// Cookies
res.setCookie(name, value, options)
res.removeCookie(name)

// Files
res.download(filepath, filename?)
res.sendFile(file)
```

## TypeScript Support

All APIs include full TypeScript definitions:

```typescript
import { createApp, Request, Response } from 'rnode-server';

const app = createApp();

app.get('/api/users/{id}', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ userId: id });
});
```

## Next Steps

- [Guide](../guide/) - Getting started tutorials
- [Examples](../examples/) - Practical usage examples
- [Types](../types/) - TypeScript interfaces
