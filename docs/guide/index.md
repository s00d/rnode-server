# Getting Started

## Overview

Complete guide to get started with RNode Server.

## Quick Start

- **[Installation](./installation.md)** - Install and setup RNode Server
- **[Quick Start](./quick-start.md)** - Create your first server
- **[Configuration](./configuration.md)** - Configure SSL, logging, and more

## Installation

```bash
npm install rnode-server
```

## Your First Server

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

## Key Concepts

### Express-like API
RNode Server provides a familiar Express.js-like API for easy migration and adoption.

### High Performance
Built with Rust backend for exceptional performance - up to 2.7× faster than Express.js.

### TypeScript Support
Full TypeScript support with comprehensive type definitions.

### Built-in Features
- Static file serving
- File upload/download
- Template engine
- HTTP utilities
- Prometheus metrics

## Next Steps

- [API Reference](../api/) - Complete API documentation
- [Examples](../examples/) - Practical usage examples
- [Architecture](../architecture/) - System design overview
