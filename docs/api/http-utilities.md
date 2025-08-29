# HTTP Utilities

## Overview

RNode Server provides built-in HTTP client utilities for making external HTTP requests directly from the backend.

## Single HTTP Request

### `app.httpRequest(method, url, headers, body, timeout)`

Makes a single HTTP request with automatic JSON parsing.

**Parameters:**
- `method` (string) - HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- `url` (string) - Target URL
- `headers` (Record<string, string>) - Request headers
- `body` (string) - Request body (empty string for GET requests)
- `timeout` (number) - Timeout in milliseconds (default: 30000)

**Returns:** Promise with response object containing:
- `success` (boolean) - Request success status
- `status` (number) - HTTP status code
- `headers` (Record<string, string>) - Response headers
- `body` (any) - Parsed response body (JSON if possible, string otherwise)
- `bodyRaw` (string) - Raw response body as string
- `url` (string) - Requested URL
- `method` (string) - HTTP method used

**Example:**
```typescript
const response = await app.httpRequest('GET', 'https://api.example.com/users', {
  'Authorization': 'Bearer token123'
}, '', 5000);

if (response.success) {
  console.log('User data:', response.body);
  console.log('Status:', response.status);
} else {
  console.error('Request failed:', response.status);
}
```

## Batch HTTP Requests

### `app.httpBatch(requests, timeout)`

Executes multiple HTTP requests concurrently with automatic request-response association.

**Parameters:**
- `requests` (Array<{method, url, headers?, body?}>) - Array of request objects
- `timeout` (number) - Timeout in milliseconds for all requests

**Returns:** Promise with batch response object containing:
- `success` (boolean) - Overall success status
- `count` (number) - Number of requests processed
- `results` (Array<string>) - Array of JSON response strings, each with `requestIndex` field

**Example:**
```typescript
const batchRequests = [
  { method: 'GET', url: 'https://api.example.com/users/1' },
  { method: 'POST', url: 'https://api.example.com/users', 
    body: '{"name": "John", "email": "john@example.com"}' },
  { method: 'GET', url: 'https://api.example.com/posts/1' }
];

const batchResponse = await app.httpBatch(batchRequests, 10000);

if (batchResponse.success) {
  // Process results with request association
  batchResponse.results.forEach((resultStr, index) => {
    const result = JSON.parse(resultStr);
    console.log(`Request ${index}:`, result.body);
    console.log(`Status:`, result.status);
  });
}
```

## Features

### Automatic JSON Parsing
Response body automatically parsed if valid JSON.

### Request Association
Batch requests include `requestIndex` for easy mapping.

### Concurrent Execution
Multiple requests run simultaneously for better performance.

### Timeout Handling
Configurable timeout with proper error responses.

### Header Support
Full custom header support for authentication and content negotiation.

### Error Handling
Structured error responses with status codes and messages.

## Use Cases

### API Aggregation
```typescript
app.get('/api/dashboard', async (req, res) => {
  try {
    const batchRequests = [
      { method: 'GET', url: 'https://api.users.com/stats' },
      { method: 'GET', url: 'https://api.orders.com/stats' },
      { method: 'GET', url: 'https://api.analytics.com/stats' }
    ];
    
    const response = await app.httpBatch(batchRequests, 5000);
    
    if (response.success) {
      const results = response.results.map(resultStr => JSON.parse(resultStr));
      res.json({
        users: results[0].body,
        orders: results[1].body,
        analytics: results[2].body
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### External API Integration
```typescript
app.post('/api/validate-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    const response = await app.httpRequest('POST', 'https://api.email-validator.com/validate', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EMAIL_VALIDATOR_API_KEY}`
    }, JSON.stringify({ email }), 10000);
    
    if (response.success) {
      res.json(response.body);
    } else {
      res.status(response.status).json({ error: 'Email validation failed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Health Checks
```typescript
app.get('/health', async (req, res) => {
  const healthChecks = [
    { method: 'GET', url: 'https://database.example.com/health' },
    { method: 'GET', url: 'https://cache.example.com/health' },
    { method: 'GET', url: 'https://storage.example.com/health' }
  ];
  
  const response = await app.httpBatch(healthChecks, 5000);
  
  if (response.success) {
    const results = response.results.map(resultStr => JSON.parse(resultStr));
    const allHealthy = results.every(result => result.status === 200);
    
    res.json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      services: results.map((result, index) => ({
        service: healthChecks[index].url,
        status: result.status === 200 ? 'healthy' : 'unhealthy'
      }))
    });
  } else {
    res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
  }
});
```

## Error Handling

### Network Errors
```typescript
try {
  const response = await app.httpRequest('GET', 'https://api.example.com/data');
  // Process response
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Connection refused');
  } else if (error.code === 'ETIMEDOUT') {
    console.error('Request timeout');
  } else {
    console.error('Network error:', error.message);
  }
}
```

### HTTP Errors
```typescript
const response = await app.httpRequest('GET', 'https://api.example.com/data');

if (!response.success) {
  switch (response.status) {
    case 401:
      console.error('Unauthorized - check API key');
      break;
    case 403:
      console.error('Forbidden - insufficient permissions');
      break;
    case 404:
      console.error('Resource not found');
      break;
    case 429:
      console.error('Rate limited - too many requests');
      break;
    case 500:
      console.error('Server error - try again later');
      break;
    default:
      console.error(`HTTP error: ${response.status}`);
  }
}
```

## Best Practices

### Timeout Configuration
```typescript
// Set appropriate timeouts for different types of requests
const quickRequest = await app.httpRequest('GET', 'https://api.example.com/health', {}, '', 2000);
const dataRequest = await app.httpRequest('GET', 'https://api.example.com/data', {}, '', 10000);
const uploadRequest = await app.httpRequest('POST', 'https://api.example.com/upload', {}, data, 30000);
```

### Error Retry Logic
```typescript
async function makeRequestWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await app.httpRequest('GET', url);
      if (response.success) {
        return response;
      }
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        break;
      }
      
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    } catch (error) {
      console.error(`Attempt ${attempt} error:`, error.message);
      if (attempt === maxRetries) throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Request Logging
```typescript
app.use('/api/external', async (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const response = await app.httpRequest('GET', 'https://api.external.com/data');
    const duration = Date.now() - startTime;
    
    console.log(`External API call: ${duration}ms, status: ${response.status}`);
    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`External API error: ${duration}ms, error: ${error.message}`);
    next(error);
  }
});
```

## Next Steps

- [App API](./app.md) - Main application methods
- [Examples](../examples/) - Practical usage examples
- [Architecture](../architecture/) - System design overview
