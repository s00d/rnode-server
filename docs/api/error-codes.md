# Error Status Codes

## Overview

RNode Server returns proper HTTP status codes for all responses, including errors and timeouts.

## HTTP Status Codes

### Success Responses

| Status | Description | When Used |
|--------|-------------|-----------|
| **200** | OK | Normal successful response |
| **201** | Created | Resource created successfully |
| **204** | No Content | Success but no content to return |

### Client Errors (4xx)

| Status | Description | When Used |
|--------|-------------|-----------|
| **400** | Bad Request | Invalid input data or malformed request |
| **401** | Unauthorized | Authentication required or failed |
| **403** | Forbidden | Access denied, insufficient permissions |
| **404** | Not Found | Requested resource doesn't exist |
| **405** | Method Not Allowed | HTTP method not supported for this endpoint |
| **408** | Request Timeout | Handler exceeded timeout limit |
| **409** | Conflict | Resource conflict (e.g., duplicate email) |
| **422** | Unprocessable Entity | Valid request but semantic errors |
| **429** | Too Many Requests | Rate limit exceeded |
| **451** | Unavailable For Legal Reasons | Content blocked for legal reasons |

### Server Errors (5xx)

| Status | Description | When Used |
|--------|-------------|-----------|
| **500** | Internal Server Error | Handler execution failed or unexpected error |
| **501** | Not Implemented | Feature not yet implemented |
| **502** | Bad Gateway | Upstream service error |
| **503** | Service Unavailable | Service temporarily unavailable |
| **504** | Gateway Timeout | Upstream service timeout |
| **507** | Insufficient Storage | Storage quota exceeded |

## Error Response Format

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password too short"
    }
  }
}
```

### Timeout Error Response
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT_ERROR",
    "message": "Handler timeout after 5000ms",
    "details": {
      "timeout": 5000,
      "handler": "/api/slow-operation"
    }
  }
}
```

## Common Error Scenarios

### Validation Errors (400)
```typescript
app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body;
  
  const errors = [];
  
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!email || !email.includes('@')) {
    errors.push('Valid email is required');
  }
  
  if (age && (age < 0 || age > 150)) {
    errors.push('Age must be between 0 and 150');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    });
  }
  
  // Process valid data...
  res.json({ success: true, message: 'User created' });
});
```

### Authentication Errors (401)
```typescript
app.use('/api/protected', (req, res, next) => {
  const token = req.getHeader('authorization');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication token required'
      }
    });
  }
  
  try {
    const user = validateToken(token);
    req.setParam('user', user);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
});
```

### Authorization Errors (403)
```typescript
app.get('/api/admin/users', (req, res, next) => {
  const user = req.getParam('user');
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
        details: {
          requiredRole: 'admin',
          currentRole: user?.role || 'none'
        }
      }
    });
  }
  
  next();
});
```

### Resource Not Found (404)
```typescript
app.get('/api/users/{id}', (req, res) => {
  const { id } = req.params;
  const user = findUserById(id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        details: {
          userId: id,
          searchedAt: new Date().toISOString()
        }
      }
    });
  }
  
  res.json({ success: true, user });
});
```

### Rate Limiting (429)
```typescript
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
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        details: {
          limit: maxRequests,
          window: windowMs,
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        }
      }
    });
  }
  
  clientData.requests.push(now);
  next();
});
```

### Timeout Errors (408)
```typescript
app.get('/api/slow-operation', async (req, res) => {
  try {
    // Simulate slow operation
    const result = await performSlowOperation();
    res.json({ success: true, result });
  } catch (error) {
    if (error.code === 'TIMEOUT') {
      res.status(408).json({
        success: false,
        error: {
          code: 'HANDLER_TIMEOUT',
          message: 'Operation timed out',
          details: {
            timeout: 5000,
            operation: 'performSlowOperation'
          }
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Operation failed'
        }
      });
    }
  }
});
```

### Internal Server Errors (500)
```typescript
app.get('/api/risky-operation', async (req, res, next) => {
  try {
    const result = await performRiskyOperation();
    res.json({ success: true, result });
  } catch (error) {
    // Log error for debugging
    console.error('Risky operation failed:', error);
    
    // Pass to error handling middleware
    next(error);
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
});
```

## Custom Error Classes

### Creating Custom Errors
```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
```

### Using Custom Errors
```typescript
app.get('/api/users/{id}', (req, res, next) => {
  try {
    const { id } = req.params;
    const user = findUserById(id);
    
    if (!user) {
      throw new NotFoundError('User');
    }
    
    if (!req.getParam('isAuthenticated')) {
      throw new AuthenticationError();
    }
    
    if (user.id !== req.getParam('userId') && req.getParam('userRole') !== 'admin') {
      throw new AuthorizationError('Cannot access other users');
    }
    
    res.json({ success: true, user });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details })
        }
      });
    } else {
      next(error);
    }
  }
});
```

## Error Handling Best Practices

### Consistent Error Format
Always return errors in the same format for consistency.

### Appropriate Status Codes
Use the most specific status code that matches the error condition.

### Detailed Error Messages
Provide helpful error messages for debugging (but not in production).

### Error Logging
Log errors appropriately for monitoring and debugging.

### Client-Friendly Messages
Return user-friendly error messages while logging technical details.

### Error Recovery
Provide guidance on how to resolve the error when possible.

## Next Steps

- [Request Object](./request.md) - Request properties and methods
- [Response Object](./response.md) - Response methods and options
- [Examples](../examples/) - Error handling examples
