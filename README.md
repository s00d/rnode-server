
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=for-the-badge)](https://github.com/s00d/rnode-server)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](https://github.com/s00d/rnode-server/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/s00d/rnode-server?style=for-the-badge)](https://github.com/s00d/rnode-server/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/s00d/rnode-server/total?style=for-the-badge)](https://github.com/s00d/rnode-server/releases)
[![GitHub issues](https://img.shields.io/badge/github-issues-orange?style=for-the-badge)](https://github.com/s00d/rnode-server/issues)
[![GitHub stars](https://img.shields.io/badge/github-stars-yellow?style=for-the-badge)](https://github.com/s00d/rnode-server/stargazers)
[![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/rnode-server)
[![Donate](https://img.shields.io/badge/Donate-Donationalerts-ff4081?style=for-the-badge)](https://www.donationalerts.com/r/s00d88)

# RNode Server

![Header](assets/header_min.png)

> **🚀 Experimental Project**: This is an experimental attempt to create a high-performance Node.js server built with Rust, featuring Express-like API with advanced middleware support.


High-performance Node.js server built with Rust and integrated through Neon FFI.

## ✨ Features

- 🚀 **High Performance** - Built with Rust and Node.js
- 🔧 **Express-like API** - Familiar routing and middleware
- 📁 **Static File Serving** - With compression and caching
- 📤 **File Upload** - Multipart form data support
- 📥 **File Download** - Secure file serving
- 🎨 **Template Engine** - Tera templates with inheritance
- 🔒 **HTTPS Support** - SSL/TLS encryption with certificate support
- 🌐 **IP Detection** - Client IP from various proxy headers
- 🔌 **Express Middleware** - Use existing Express plugins
- 📊 **Built-in Monitoring** - Prometheus metrics and Grafana dashboards
- 🔄 **Revolutionary Promise System** - Zero CPU waste promise management
- 🧠 **Smart State Management** - Efficient Rust-based state handling
- 💾 **Zero Memory Leaks** - Automatic promise cleanup
- 🎯 **TypeScript Support** - Full TypeScript definitions
- 🌍 **CORS Support** - Configurable cross-origin resource sharing
- 🍪 **Cookie Management** - Advanced cookie handling with helpers
- 🔧 **Parameter System** - Global and route-specific parameter management
- 🚦 **Router Support** - Modular routing with nested routers
- 📝 **HTTP Utilities** - Built-in client utilities (`httpRequest`, `httpBatch`)
- 🔍 **Error Handling** - Comprehensive error codes and handling

## Installation

```bash
npm install rnode-server
```

## Quick Start

```javascript
const { createServer } = require('rnode-server');

const app = createServer();

app.get('/', (req, res) => {
  res.send('Hello from RNode Server!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Performance

> **Note**: Performance tests were conducted on a personal laptop. Results may vary depending on server configuration, hardware, and environment.

| Metric                   | Express (`:4547/hello`) | RNode Server (`:4546/hello`) | Difference                          |
|--------------------------|-------------------------|------------------------------|-------------------------------------|
| **Requests/sec (RPS)**   | 9,315                   | 25,378                       | **~2.7× faster**                    |
| **Average time/request** | 10.7 ms                 | 3.9 ms                       | **~2.7× faster**                    |
| **p50 (median)**         | 10 ms                   | 4 ms                         | **~2.5× faster**                    |
| **p95**                  | 14 ms                   | 7 ms                         | **~2× faster**                      |
| **Maximum (max)**        | 18 ms                   | 13 ms                        | **Shorter tail**                    |
| **Transfer rate**        | 3.3 MB/s                | 6.6 MB/s                     | **~2× higher**                      |
| **Total transferred**    | 3.63 MB                 | 2.66 MB                      | Express sent more (headers/wrapper) |

### Key Performance Advantages

- **~2.7× faster** request processing
- **~2.7× lower** average response time  
- **~2× better** transfer rates
- **Shorter latency tails** for better user experience
- **Efficient memory usage** with Rust backend

## Documentation

Full documentation is available at: [https://s00d.github.io/rnode-server/](https://s00d.github.io/rnode-server/)

## License

MIT