---
layout: home

hero:
  name: "RNode Server"
  text: "High-performance Node.js server built with Rust"
  tagline: Express-like API with advanced middleware support, featuring revolutionary promise management and zero CPU waste.
  actions:
    - theme: brand
      text: 🚀 Get Started
      link: /guide/
    - theme: alt
      text: ⭐ View on GitHub
      link: https://github.com/s00d/rnode-server

features:
  - title: ⚡ High Performance
    details: 🚀 Built with Rust backend for native speed, achieving ~2.7× faster request processing compared to Express.js.
  - title: 🔄 Revolutionary Promise System
    details: 🧠 JavaScript promises awaited directly in Rust with zero CPU waste, instant notification, and built-in timeouts.
  - title: 🎯 Express-like API
    details: 🛠️ Familiar routing and middleware patterns, making it easy to migrate from Express.js applications.
  - title: 🎨 Template Engine
    details: 🔧 Integrated Tera template engine for server-side HTML rendering with inheritance and macros.
  - title: 📁 Advanced File Operations
    details: 📤 Comprehensive file upload, download, and management with security options and wildcard support.
  - title: 📊 Built-in Monitoring
    details: 📈 Prometheus metrics, Grafana dashboards, and performance monitoring out of the box.
---

# RNode Server

> **🚀 Experimental Project**: High-performance Node.js server built with Rust, featuring Express-like API with advanced middleware support.

## Overview

RNode Server is a **full-featured server implementation** built from the ground up with Rust and Node.js bindings. The goal is to create a production-ready server with all the necessary configurations for fast deployment and optimal performance.

## Key Features

- 🚀 **High Performance** - Built with Rust and Node.js
- 🔧 **Express-like API** - Familiar routing and middleware
- 📁 **Static File Serving** - With compression and caching
- 📤 **File Upload** - Multipart form data support
- 📥 **File Download** - Secure file serving
- 🎨 **Template Engine** - Tera templates with inheritance
- 🔒 **HTTPS Support** - SSL/TLS encryption with certificate support
- 🌐 **IP Detection** - Client IP from various proxy headers
- 🔌 **Express Middleware** - Use existing Express plugins

## Performance

| Metric                   | Express | RNode Server | Difference |
|--------------------------|---------|--------------|------------|
| **Requests/sec (RPS)**   | 9,315   | 25,378      | **~2.7× faster** |
| **Average time/request** | 10.7 ms | 3.9 ms      | **~2.7× faster** |
| **Transfer rate**        | 3.3 MB/s| 6.6 MB/s    | **~2× higher** |

## Quick Start

### Installation

:::tabs
== npm
```bash
npm install rnode-server
```

== pnpm
```bash
pnpm add rnode-server
```

== yarn
```bash
yarn add rnode-server
```
:::

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

## Architecture

RNode Server uses a **unique hybrid approach** where **all JavaScript code execution happens through Rust backend**. This architecture provides:

- **🚀 Performance**: Rust handles HTTP parsing, routing, and response generation at native speed
- **🔒 Security**: Rust's memory safety prevents common server vulnerabilities
- **⚡ Efficiency**: Minimal overhead between HTTP layer and JavaScript execution
- **🔄 Revolutionary Promise System**: No more polling - instant notification when promises complete

## Get Started

- [Installation](./guide/installation.md) - Get RNode Server up and running
- [Quick Start](./guide/quick-start.md) - Your first server in minutes
- [Examples](./examples/) - Real-world examples and use cases
- [API Reference](./api/) - Complete API documentation
