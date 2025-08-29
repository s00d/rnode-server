# TypeScript Interfaces

## Core Types

### RequestBody
```typescript
export type RequestBody = 
  | Record<string, string>    // Form data
  | Record<string, any>       // JSON data
  | string                    // Text data
  | BinaryData;               // Binary data
```

### BinaryData
```typescript
export interface BinaryData {
  type: 'binary';
  data: string;               // Base64 encoded
  contentType: string;
  size: number;
}
```

### CookieOptions
```typescript
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
}
```

### ParsedCookie
```typescript
export interface ParsedCookie {
  name: string;
  value: string;
  options: CookieOptions;
}
```

## App Configuration

### AppOptions
```typescript
export interface AppOptions {
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  metrics?: boolean;
  ssl?: SSLOptions;
}
```

### SSLOptions
```typescript
export interface SSLOptions {
  certPath: string;
  keyPath: string;
}
```

## Static File Options

### StaticOptions
```typescript
export interface StaticOptions {
  cache?: boolean;
  maxAge?: number;
  maxFileSize?: number;
  etag?: boolean;
  lastModified?: boolean;
  gzip?: boolean;
  brotli?: boolean;
  allowHiddenFiles?: boolean;
  allowSystemFiles?: boolean;
  allowedExtensions?: string[];
  blockedPaths?: string[];
}
```

## Upload Options

### UploadOptions
```typescript
export interface UploadOptions {
  folder: string;
  allowedSubfolders?: string[];
  maxFileSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  multiple?: boolean;
  maxFiles?: number;
  overwrite?: boolean;
}
```

## Download Options

### DownloadOptions
```typescript
export interface DownloadOptions {
  folder: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
  blockedPaths?: string[];
  allowHiddenFiles?: boolean;
  allowSystemFiles?: boolean;
}
```

## HTTP Request Options

### HttpRequestOptions
```typescript
export interface HttpRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}
```

### HttpBatchRequest
```typescript
export interface HttpBatchRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}
```

## HTTP Response Types

### HttpResponse
```typescript
export interface HttpResponse {
  success: boolean;
  status: number;
  headers: Record<string, string>;
  body: any;
  bodyRaw: string;
  url: string;
  method: string;
}
```

### HttpBatchResponse
```typescript
export interface HttpBatchResponse {
  success: boolean;
  count: number;
  results: string[];
}
```

## Template Options

### TemplateOptions
```typescript
export interface TemplateOptions {
  autoescape?: boolean;
  [key: string]: any;
}
```

## File Information

### FileInfo
```typescript
export interface FileInfo {
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  filepath: string;
}
```

## Route Parameters

### RouteParams
```typescript
export interface RouteParams {
  [key: string]: string;
}
```

### QueryParams
```typescript
export interface QueryParams {
  [key: string]: string | string[];
}
```

## Middleware Types

### MiddlewareFunction
```typescript
export type MiddlewareFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;
```

### NextFunction
```typescript
export type NextFunction = () => void;
```

## Handler Types

### RouteHandler
```typescript
export type RouteHandler = (
  req: Request,
  res: Response
) => void | Promise<void>;
```

## Error Types

### ServerError
```typescript
export interface ServerError extends Error {
  statusCode?: number;
  code?: string;
}
```

## Usage Examples

### Creating Typed Routes
```typescript
import { createApp, Request, Response } from 'rnode-server';

interface UserData {
  name: string;
  email: string;
  age?: number;
}

interface CreateUserRequest extends Request {
  body: UserData;
}

interface CreateUserResponse extends Response {
  json(data: { success: boolean; userId: string; user: UserData }): void;
}

const app = createApp();

app.post('/api/users', (req: CreateUserRequest, res: CreateUserResponse) => {
  const { name, email, age } = req.body;
  
  // TypeScript will provide autocomplete and type checking
  if (!name || !email) {
    return res.status(400).json({ 
      success: false, 
      userId: '', 
      user: { name: '', email: '' } 
    });
  }
  
  const userId = Date.now().toString();
  
  res.json({
    success: true,
    userId,
    user: { name, email, age }
  });
});
```

### Typed Middleware
```typescript
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

const authMiddleware: MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => {
  const token = req.getHeader('authorization');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Validate token and get user
    const user = validateToken(token);
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Use typed middleware
app.use('/api/protected', authMiddleware);

app.get('/api/protected/profile', (req: AuthenticatedRequest, res: Response) => {
  // TypeScript knows req.user exists and is typed
  res.json({ user: req.user });
});
```
