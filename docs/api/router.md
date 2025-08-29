# Router API

## Creating a Router

```javascript
import { Router } from 'rnode-server';

const router = Router();
```

## HTTP Methods

### GET
```javascript
router.get(path, handler)
```
Register GET route handler.

### POST
```javascript
router.post(path, handler)
```
Register POST route handler.

### PUT
```javascript
router.put(path, handler)
```
Register PUT route handler.

### DELETE
```javascript
router.delete(path, handler)
```
Register DELETE route handler.

### PATCH
```javascript
router.patch(path, handler)
```
Register PATCH route handler.

### OPTIONS
```javascript
router.options(path, handler)
```
Register OPTIONS route handler.

## Middleware

### Global Router Middleware
```javascript
router.use(middleware)
```
Register middleware for all routes in this router.

### Route-specific Middleware
```javascript
router.use(path, middleware)
```
Register middleware for specific route path in this router.

## Router Information

### Get Handlers
```javascript
const handlers = router.getHandlers()
```
Get all registered handlers.

### Get Middlewares
```javascript
const middlewares = router.getMiddlewares()
```
Get all registered middlewares.

## Example Usage

```javascript
import { createApp, Router } from 'rnode-server';

const app = createApp();
const usersRouter = Router();

// Middleware for users router
usersRouter.use((req, res, next) => {
  console.log('👥 Users Router Middleware:', req.method, req.url);
  req.setParam('routerName', 'users');
  next();
});

// Routes
usersRouter.get('/', (req, res) => {
  res.json({ users: [], router: req.getParam('routerName') });
});

usersRouter.post('/', (req, res) => {
  res.json({ created: true });
});

usersRouter.get('/{id}', (req, res) => {
  const { id } = req.params;
  res.json({ userId: id });
});

// Mount router
app.useRouter('/api/users', usersRouter);
```
