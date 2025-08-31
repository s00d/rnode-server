# Metrics & Monitoring

## Enable Metrics

```javascript
import { createApp } from 'rnode-server';

const app = createApp({ 
  logLevel: "info", 
  metrics: true  // Enable Prometheus metrics
});
```

## Access Metrics

- **Metrics Endpoint**: `GET /metrics` (Prometheus format)

## Available Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|---------|
| `http_requests_total` | Counter | Total HTTP requests | `method`, `path`, `status` |
| `http_requests_duration_seconds` | Histogram | Request duration | `method`, `path`, `status` |
| `rnode_server_process_cpu_usage_percent` | Gauge | Process CPU usage | - |
| `rnode_server_process_memory_kb` | Gauge | Process memory usage | - |
| `rnode_server_uptime_seconds` | Gauge | Server uptime | - |
| `rnode_server_pending_requests` | Gauge | Pending requests count | - |
| `rnode_server_slow_requests_total` | Counter | Slow requests (>1s) | `method`, `path`, `duration_range` |
| `rnode_server_cache_hits_total` | Counter | Cache hits | - |
| `rnode_server_cache_misses_total` | Counter | Cache misses | - |
| `rnode_server_total_connections` | Counter | Total connections | - |
| `rnode_server_websocket_connections_total` | Counter | Total WebSocket connections | - |
| `rnode_server_websocket_disconnections_total` | Counter | Total WebSocket disconnections | - |
| `rnode_server_websocket_connections_active` | Gauge | Active WebSocket connections | - |
| `rnode_server_websocket_rooms_total` | Gauge | Total WebSocket rooms | - |
| `rnode_server_websocket_room_connections` | Gauge | Connections per room | `room_id`, `room_name` |
| `rnode_server_websocket_messages_sent_total` | Counter | Total messages sent | `type`, `room_id`, `path` |
| `rnode_server_websocket_messages_received_total` | Counter | Total messages received | `type`, `room_id`, `path` |
| `rnode_server_websocket_connection_duration_seconds` | Histogram | Connection duration | `path`, `room_id` |
| `rnode_server_websocket_message_size_bytes` | Histogram | Message size | `type`, `direction` |
| `rnode_server_websocket_errors_total` | Counter | Total WebSocket errors | `error_type`, `path`, `room_id` |

## PromQL Queries

### Request Rate
```sql
# Requests per second
rate(http_requests_total[5m])

# Requests by method
rate(http_requests_total[5m]) by (method)

# Requests by status code
rate(http_requests_total[5m]) by (status)
```

### Response Time
```sql
# 95th percentile response time
histogram_quantile(0.95, rate(http_requests_duration_seconds_bucket[5m]))

# Average response time
rate(http_requests_duration_seconds_sum[5m]) / rate(http_requests_duration_seconds_count[5m])
```

### Error Rate
```sql
# Error rate (4xx, 5xx)
rate(http_requests_total{status=~"4..|5.."}[5m])

# Error percentage
(rate(http_requests_total{status=~"4..|5.."}[5m]) / rate(http_requests_total[5m])) * 100
```

### System Metrics
```sql
# CPU usage
rnode_server_process_cpu_usage_percent

# Memory usage
rnode_server_process_memory_kb

# Server uptime
rnode_server_uptime_seconds
```

### WebSocket Metrics
```sql
# WebSocket connection rate
rate(rnode_server_websocket_connections_total[5m])

# Active WebSocket connections
rnode_server_websocket_connections_active

# WebSocket message rate
rate(rnode_server_websocket_messages_sent_total[5m])
rate(rnode_server_websocket_messages_received_total[5m])

# WebSocket error rate
rate(rnode_server_websocket_errors_total[5m])

# Average connection duration
histogram_quantile(0.95, rate(rnode_server_websocket_connection_duration_seconds_bucket[5m]))

# Average message size
histogram_quantile(0.50, rate(rnode_server_websocket_message_size_bytes_bucket[5m]))

# Messages by type
rate(rnode_server_websocket_messages_sent_total[5m]) by (type)
rate(rnode_server_websocket_messages_received_total[5m]) by (type)

# Errors by type
rate(rnode_server_websocket_errors_total[5m]) by (error_type)

# Room connections
rnode_server_websocket_room_connections

# Total rooms
rnode_server_websocket_rooms_total
```

## Grafana Dashboard

For a complete monitoring setup, see [Grafana Dashboard Configuration](./grafana-dashboard.md).

## Custom Metrics

You can extend metrics by creating custom Prometheus metrics in your application:

```javascript
// Example: Custom business metrics
app.get('/api/orders', (req, res) => {
  // Increment custom metric
  // orders_total.inc();
  
  res.json({ orders: [] });
});
```

## Alerting Rules

### High Error Rate
```yaml
groups:
  - name: rnode-server
    rules:
      - alert: HighErrorRate
        expr: (rate(http_requests_total{status=~"4..|5.."}[5m]) / rate(http_requests_total[5m])) * 100 > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"
```

### High Response Time
```yaml
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_requests_duration_seconds_bucket[5m])) > 1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
```

### High CPU Usage
```yaml
      - alert: HighCPUUsage
        expr: rnode_server_process_cpu_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}%"
```
