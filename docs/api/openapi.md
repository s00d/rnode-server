# OpenAPI Integration

## Overview

RNode Server provides built-in OpenAPI (Swagger) integration for automatic API documentation generation. The OpenAPI functionality is integrated directly into the app instance through the `openapi()` method.

## Basic Usage

```typescript
import { createApp } from 'rnode-server';

const app = createApp({ logLevel: "debug", metrics: true });

// Initialize OpenAPI documentation
app.openapi({
  title: 'My API',
  version: '1.0.0',
  description: 'High-performance API built with RNode Server',
  contact: {
    name: 'API Support',
    email: 'support@example.com'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.example.com',
      description: 'Production server'
    }
  ],
  apis: ['./src/**/*.ts'] // Paths to files with JSDoc comments
});

// Your API routes with JSDoc documentation
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

## Configuration Options

### OpenAPIConfig Interface

```typescript
interface OpenAPIConfig {
  title?: string;           // API title (default: 'RNode Server API')
  version?: string;         // API version (default: '1.0.0')
  description?: string;     // API description
  contact?: {
    name?: string;          // Contact name
    email?: string;        // Contact email
  };
  servers?: Array<{
    url: string;            // Server URL
    description: string;    // Server description
  }>;
  apis?: string[];         // Paths to files with JSDoc comments
}
```

## Automatic Routes

When you call `app.openapi()`, the following routes are automatically added:

- **GET /api/openapi.json** - Returns the OpenAPI specification in JSON format
- **GET /api/docs** - Interactive Swagger UI documentation
- **GET /api/docs/redoc** - Alternative ReDoc documentation

## JSDoc Documentation

Document your API endpoints using JSDoc comments with `@swagger` tags:

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a list of all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves a specific user by their ID
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
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
app.get('/api/users/{id}', (req, res) => {
  const { id } = req.params;
  res.json({ id, name: 'John Doe' });
});
```

## Predefined Schemas

RNode Server includes several predefined schemas that you can reference:

### User Schema
```yaml
User:
  type: object
  properties:
    id:
      type: string
      description: User unique identifier
    name:
      type: string
      description: User full name
    email:
      type: string
      format: email
      description: User email address
    createdAt:
      type: string
      format: date-time
      description: User creation timestamp
  required: [id, name, email]
```

### Error Schema
```yaml
Error:
  type: object
  properties:
    success:
      type: boolean
      example: false
    error:
      type: string
      description: Error message
    code:
      type: string
      description: Error code
```

### SuccessResponse Schema
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

### PaginatedResponse Schema
```yaml
PaginatedResponse:
  type: object
  properties:
    success:
      type: boolean
      example: true
    data:
      type: array
      items:
        type: object
    pagination:
      type: object
      properties:
        page:
          type: integer
          description: Current page number
        limit:
          type: integer
          description: Items per page
        total:
          type: integer
          description: Total number of items
        pages:
          type: integer
          description: Total number of pages
```

## Security Schemes

The following security schemes are predefined:

### Bearer Authentication
```yaml
bearerAuth:
  type: http
  scheme: bearer
  bearerFormat: JWT
```

### API Key Authentication
```yaml
apiKey:
  type: apiKey
  in: header
  name: X-API-Key
```

### Basic Authentication
```yaml
basicAuth:
  type: http
  scheme: basic
```

## Advanced Usage

### Custom Schemas

You can define custom schemas in your JSDoc comments:

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 *       required: [id, name, price]
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
  res.json({ products: [] });
});
```

### Request Body Documentation

```typescript
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 150
 *                 example: 30
 *             required: [name, email]
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body;
  res.status(201).json({ id: '123', name, email, age });
});
```

### Query Parameters

```typescript
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get users with filters
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Paginated users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
app.get('/api/users', (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  res.json({
    success: true,
    data: [],
    pagination: { page, limit, total: 0, pages: 0 }
  });
});
```

## Methods

### openapi(config: OpenAPIConfig): RNodeApp

Initializes OpenAPI documentation and automatically adds documentation routes.

**Parameters:**
- `config` - OpenAPI configuration object

**Returns:**
- `RNodeApp` - Returns the app instance for method chaining

### getOpenAPIGenerator(): OpenAPIGenerator | undefined

Returns the OpenAPI generator instance if initialized.

**Returns:**
- `OpenAPIGenerator | undefined` - The OpenAPI generator instance

## Examples

### Complete Example

```typescript
import { createApp } from 'rnode-server';

const app = createApp({ 
  logLevel: "debug", 
  metrics: true,
  timeout: 30000 
});

// Initialize OpenAPI
app.openapi({
  title: 'User Management API',
  version: '1.0.0',
  description: 'API for managing users',
  contact: {
    name: 'Development Team',
    email: 'dev@example.com'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development'
    },
    {
      url: 'https://api.example.com',
      description: 'Production'
    }
  ],
  apis: ['./src/**/*.ts']
});

// API Routes with documentation
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  res.status(201).json({ message: 'User created' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('API Documentation: http://localhost:3000/api/docs');
  console.log('OpenAPI JSON: http://localhost:3000/api/openapi.json');
});
```

## Best Practices

1. **Document all endpoints** - Use JSDoc comments for every API endpoint
2. **Use predefined schemas** - Reference the built-in schemas when possible
3. **Group by tags** - Use tags to organize related endpoints
4. **Provide examples** - Include example values in your documentation
5. **Validate responses** - Document all possible response codes
6. **Keep documentation updated** - Update JSDoc comments when API changes

## Next Steps

- [Examples](../examples/) - More usage examples
- [Middleware](../examples/middleware.md) - Middleware documentation
- [Error Handling](../api/error-codes.md) - Error handling patterns
