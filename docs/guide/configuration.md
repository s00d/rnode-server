# Configuration

## App Options

```javascript
import { createApp } from 'rnode-server';

const app = createApp({
  logLevel: 'info',    // 'trace', 'debug', 'info', 'warn', 'error'
  metrics: true,       // Enable Prometheus metrics
  ssl: {              // SSL configuration (optional)
    certPath: './ssl/server.crt',
    keyPath: './ssl/server.key'
  }
});
```

## Log Levels

- **`trace`** - Most verbose, shows all logs
- **`debug`** - Debug information
- **`info`** - General information (default)
- **`warn`** - Warning messages
- **`error`** - Error messages only

## SSL Configuration

### Generate Self-Signed Certificates

```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:4096 \
  -keyout ssl/server.key \
  -out ssl/server.crt \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### Use in App

```javascript
const app = createApp({
  ssl: {
    certPath: './ssl/server.crt',
    keyPath: './ssl/server.key'
  }
});

// Server will use HTTPS
app.listen(3000);
```

## Metrics

Enable Prometheus metrics:

```javascript
const app = createApp({ 
  logLevel: "info", 
  metrics: true
});
```

Access metrics at `GET /metrics`

## Next Steps

- [API Reference](../api/) - Complete API documentation
- [Examples](../examples/) - Real-world examples
- [Monitoring](../monitoring/) - Metrics and monitoring
