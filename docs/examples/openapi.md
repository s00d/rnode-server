# OpenAPI Documentation Example

## Overview

This example demonstrates how to use RNode Server's built-in OpenAPI integration to automatically generate API documentation.

## Complete Example

```typescript
import { createApp, Router } from 'rnode-server';
import path from "path";

const app = createApp({ 
  logLevel: "debug", 
  metrics: true, 
  timeout: 3000, 
  devMode: false 
});

const port = 4546;

// Initialize OpenAPI documentation
app.openapi({
  title: 'RNode Server API',
  version: '1.0.0',
  description: 'High-performance API built with RNode Server',
  contact: {
    name: 'API Support',
    email: 'support@rnode-server.com'
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Development server'
    },
    {
      url: 'https://api.example.com',
      description: 'Production server'
    }
  ],
  apis: ['./src/example_m.ts']
});

// Load static files into memory
app.static('./public');

// Middleware for CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// API Routes with JSDoc documentation

/**
 * @swagger
 * /hello:
 *   get:
 *     summary: Simple hello endpoint
 *     description: Returns a simple hello message
 *     tags: [Basic]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Hello World!"
 */
app.get('/hello', (req, res) => {
  res.send('Hello World!');
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user in the system
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john@example.com"
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 150
 *                 description: User's age
 *                 example: 30
 *             required:
 *               - name
 *               - email
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/users', (req, res) => {
  res.json({ message: 'User created successfully' });
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves user information by user ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User unique identifier
 *     responses:
 *       200:
 *         description: User found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   description: User ID
 *                 message:
 *                   type: string
 *                   description: Success message
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update user by ID
 *     description: Updates user information by user ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User unique identifier
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *   delete:
 *     summary: Delete user by ID
 *     description: Deletes user by user ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User unique identifier
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
app.any('/api/users/{id}', (req, res) => {
  const userId = req.params.id;
  res.json({ userId, message: 'User found' });
});

/**
 * @swagger
 * /api/slow:
 *   get:
 *     summary: Slow request endpoint
 *     description: Simulates a slow request for testing timeout and metrics
 *     tags: [Testing]
 *     parameters:
 *       - in: query
 *         name: delay
 *         schema:
 *           type: integer
 *           default: 2000
 *           minimum: 100
 *           maximum: 10000
 *         description: Delay in milliseconds
 *     responses:
 *       200:
 *         description: Slow request completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Slow request completed"
 *                 delay:
 *                   type: integer
 *                   description: Requested delay in milliseconds
 *                 executionTime:
 *                   type: integer
 *                   description: Actual execution time in milliseconds
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: Request completion timestamp
 *       408:
 *         description: Request timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/slow', async (req, res) => {
  const delay = parseInt(req.query.delay as string) || 2000;
  const startTime = Date.now();
  
  try {
    await req.sleep(delay);
    const executionTime = Date.now() - startTime;
    
    res.json({
      message: 'Slow request completed',
      delay: delay,
      executionTime: executionTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    res.status(500).json({
      error: 'Slow request failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      executionTime: executionTime
    });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Custom router example
const apiRouter = Router();

/**
 * @swagger
 * /custom/data:
 *   get:
 *     summary: Get custom data
 *     description: Retrieves custom data from the API router
 *     tags: [Custom]
 *     responses:
 *       200:
 *         description: Data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Data retrieved successfully"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 params:
 *                   type: object
 *                   description: Request parameters
 */
apiRouter.get('/data', (req, res) => {
  res.json({
    success: true,
    message: 'Data retrieved successfully',
    timestamp: new Date().toISOString(),
    params: req.getParams()
  });
});

app.useRouter('/custom', apiRouter);

// Start server
app.listen(port, () => {
  console.log(`🚀 RNode Server listening on port ${port}`);
  console.log(`📁 Static files served from: ${path.join(__dirname, 'public')}`);
  console.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
  console.log(`📖 ReDoc Documentation available at: http://localhost:${port}/api/docs/redoc`);
  console.log(`🔍 OpenAPI JSON available at: http://localhost:${port}/api/openapi.json`);
  console.log(`💚 Health check available at: http://localhost:${port}/api/health`);
  console.log(`\n📋 Available routes:`);
  console.log(`  GET  /hello                    - Simple hello endpoint`);
  console.log(`  POST /api/users               - Create user`);
  console.log(`  ANY  /api/users/{id}          - User operations (GET/PUT/DELETE)`);
  console.log(`  GET  /api/slow?delay=2000     - Test slow requests`);
  console.log(`  GET  /custom/data             - Custom router data`);
  console.log(`  GET  /api/docs                - Interactive API documentation (Swagger UI)`);
  console.log(`  GET  /api/docs/redoc         - Alternative API documentation (ReDoc)`);
  console.log(`  GET  /api/openapi.json        - OpenAPI specification`);
  console.log(`  GET  /api/health              - Health check`);
  console.log(`  GET  /                        - Static index.html`);
  console.log(`  GET  /style.css               - Static CSS`);
});
```

## Key Features Demonstrated

### 1. OpenAPI Initialization
```typescript
app.openapi({
  title: 'RNode Server API',
  version: '1.0.0',
  description: 'High-performance API built with RNode Server',
  contact: {
    name: 'API Support',
    email: 'support@rnode-server.com'
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: 'Development server'
    },
    {
      url: 'https://api.example.com',
      description: 'Production server'
    }
  ],
  apis: ['./src/example_m.ts']
});
```

### 2. JSDoc Documentation
Each endpoint is documented with JSDoc comments using `@swagger` tags:

```typescript
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user in the system
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *             required: [name, email]
 *     responses:
 *       200:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
app.post('/api/users', (req, res) => {
  res.json({ message: 'User created successfully' });
});
```

### 3. Automatic Route Generation
When you call `app.openapi()`, the following routes are automatically added:

- **GET /api/openapi.json** - OpenAPI specification in JSON format
- **GET /api/docs** - Interactive Swagger UI documentation
- **GET /api/docs/redoc** - Alternative ReDoc documentation

### 4. Predefined Schemas
The example uses predefined schemas like `SuccessResponse` and `Error`:

```yaml
SuccessResponse:
  type: object
  properties:
    success:
      type: boolean
      example: true
    message:
      type: string
      description: Success message
    data:
      type: object
      description: Response data
```

### 5. Parameter Documentation
Path parameters, query parameters, and request bodies are all documented:

```typescript
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User unique identifier
 */
```

## Running the Example

1. **Install dependencies:**
```bash
cd playground
npm install
```

2. **Run the server:**
```bash
npm run dev:mini
```

3. **Access the documentation:**
- Swagger UI: http://localhost:4546/api/docs
- ReDoc: http://localhost:4546/api/docs/redoc
- OpenAPI JSON: http://localhost:4546/api/openapi.json

## Testing the API

### Using curl
```bash
# Get hello message
curl http://localhost:4546/hello

# Create a user
curl -X POST http://localhost:4546/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Get user by ID
curl http://localhost:4546/api/users/123

# Test slow request
curl "http://localhost:4546/api/slow?delay=3000"

# Health check
curl http://localhost:4546/api/health
```

### Using Swagger UI
1. Open http://localhost:4546/api/docs
2. Click on any endpoint to expand it
3. Click "Try it out" to test the endpoint
4. Fill in the parameters and click "Execute"

## Best Practices

1. **Document all endpoints** - Use JSDoc comments for every API endpoint
2. **Use predefined schemas** - Reference built-in schemas when possible
3. **Group by tags** - Use tags like `[Users]`, `[System]`, `[Testing]` to organize endpoints
4. **Provide examples** - Include example values in your documentation
5. **Validate responses** - Document all possible response codes (200, 400, 404, 500, etc.)
6. **Keep documentation updated** - Update JSDoc comments when API changes

## Next Steps

- [OpenAPI API Reference](../api/openapi.md) - Complete OpenAPI documentation
- [Middleware Examples](./middleware.md) - Middleware documentation
- [Error Handling](../api/error-codes.md) - Error handling patterns
- [Advanced Usage](./advanced-usage.md) - Advanced patterns and techniques
