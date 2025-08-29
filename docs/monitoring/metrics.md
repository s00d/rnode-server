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
