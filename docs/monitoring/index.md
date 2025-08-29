# Monitoring

## Overview

RNode Server includes built-in Prometheus metrics for monitoring performance and system health.

## Key Components

- **[Metrics](./metrics.md)** - Available metrics and PromQL queries
- **[Grafana Dashboard](./grafana-dashboard.md)** - Complete dashboard configuration

## Quick Start

### Enable Metrics
```javascript
import { createApp } from 'rnode-server';

const app = createApp({ 
  logLevel: "info", 
  metrics: true  // Enable Prometheus metrics
});
```

### Access Metrics
- **Endpoint**: `GET /metrics` (Prometheus format)

## Available Metrics

### HTTP Metrics
- `http_requests_total` - Total HTTP requests with labels
- `http_requests_duration_seconds` - Request duration histogram

### System Metrics
- `rnode_server_process_cpu_usage_percent` - CPU usage
- `rnode_server_process_memory_kb` - Memory usage
- `rnode_server_uptime_seconds` - Server uptime

### Performance Metrics
- `rnode_server_slow_requests_total` - Slow requests counter
- `rnode_server_cache_hits_total` - Cache performance
- `rnode_server_total_connections` - Connection count

## Monitoring Stack

### Prometheus
- Collect metrics from `/metrics` endpoint
- Store time-series data
- Provide query language (PromQL)

### Grafana
- Visualize metrics with dashboards
- Create alerts and notifications
- Historical data analysis

### Alerting
- High error rate detection
- Response time monitoring
- Resource usage alerts

## Next Steps

- [Metrics](./metrics.md) - Detailed metrics documentation
- [Grafana Dashboard](./grafana-dashboard.md) - Dashboard setup
- [API Reference](../api/) - Complete API documentation
