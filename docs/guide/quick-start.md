# Quick Start

## Basic Server

```javascript
import { createApp } from 'rnode-server';

const app = createApp();
const port = 3000;

app.get('/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(port, () => {
  console.log(`🚀 Server started on port ${port}`);
});
```

## With Middleware

```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// Global middleware
app.use((req, res, next) => {
  req.setParam('timestamp', Date.now());
  next();
});

app.get('/hello', (req, res) => {
  const timestamp = req.getParam('timestamp');
  res.json({ 
    message: 'Hello World!', 
    timestamp 
  });
});

app.listen(3000);
```

## Router Example

```javascript
import { createApp, Router } from 'rnode-server';

const app = createApp();
const usersRouter = Router();

usersRouter.get('/', (req, res) => {
  res.json({ users: [] });
});

usersRouter.post('/', (req, res) => {
  res.json({ created: true });
});

app.useRouter('/api/users', usersRouter);
app.listen(3000);
```

## Static Files

```javascript
import { createApp } from 'rnode-server';

const app = createApp();

// Serve static files
app.static('./public');

app.listen(3000);
```

## Next Steps

- [Configuration](./configuration.md) - Configure SSL, logging, and more
- [API Reference](../api/) - Complete API documentation
- [Examples](../examples/) - Real-world examples
