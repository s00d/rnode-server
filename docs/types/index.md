# TypeScript Types

## Overview

RNode Server provides comprehensive TypeScript support with full type definitions for all APIs and interfaces.

## Core Types

- **[Interfaces](./interfaces.md)** - Complete interface definitions and examples

## Type Categories

### Request & Response
- `Request` - HTTP request object with all properties and methods
- `Response` - HTTP response object with all methods
- `RequestBody` - Union type for different body types
- `BinaryData` - Binary data interface

### Configuration
- `AppOptions` - Application configuration options
- `SSLOptions` - SSL/TLS configuration
- `StaticOptions` - Static file serving options
- `UploadOptions` - File upload configuration
- `DownloadOptions` - File download configuration

### HTTP Utilities
- `HttpRequestOptions` - Single HTTP request options
- `HttpBatchRequest` - Batch request configuration
- `HttpResponse` - HTTP response interface
- `HttpBatchResponse` - Batch response interface

### Middleware & Routing
- `MiddlewareFunction` - Middleware function type
- `NextFunction` - Next function type
- `RouteHandler` - Route handler type
- `RouteParams` - Route parameters interface
- `QueryParams` - Query string parameters

### File Operations
- `FileInfo` - File information interface
- `ParsedCookie` - Cookie parsing interface
- `CookieOptions` - Cookie configuration options

## Usage Examples

### Basic Typing
```typescript
import { createApp, Request, Response } from 'rnode-server';

const app = createApp();

app.get('/api/users/{id}', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ userId: id });
});
```

### Custom Interfaces
```typescript
interface UserRequest extends Request {
  body: {
    name: string;
    email: string;
  };
}

app.post('/api/users', (req: UserRequest, res: Response) => {
  const { name, email } = req.body;
  // TypeScript provides full type safety
});
```

## Next Steps

- [API Reference](../api/) - Complete API documentation
- [Examples](../examples/) - Practical usage examples
- [Architecture](../architecture/) - System design overview
