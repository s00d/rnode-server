# RNode Server Metrics Examples

Quick examples of how to use and extend RNode Server metrics.

## 🚀 Basic Usage

```typescript
import { createApp } from 'rnode-server';

const app = createApp({ 
  metrics: true  // Enable Prometheus metrics
});

app.listen(4546, () => {
  console.log('Server running with metrics on /metrics');
});
```

## 📊 Available Metrics

### HTTP Metrics
- `http_requests_total` - Total request count
- `http_requests_duration_seconds` - Request duration
- `rnode_server_http_status_total` - Status code counts

### System Metrics
- `rnode_server_process_cpu_usage_percent` - CPU usage
- `rnode_server_process_memory_kb` - Memory usage
- `rnode_server_uptime_seconds` - Server uptime

### Business Metrics
- `rnode_server_cache_hits_total` - Cache hits
- `rnode_server_cache_misses_total` - Cache misses
- `rnode_server_slow_requests_total` - Slow requests

## 🔧 Custom Metrics

```typescript
import { record_cache_hit, record_cache_miss } from 'rnode-server';

// Cache middleware
app.use((req, res, next) => {
  const cacheKey = req.url;
  
  if (cache.has(cacheKey)) {
    record_cache_hit();
    return res.json(cache.get(cacheKey));
  }
  
  record_cache_miss();
  next();
});
```

## 📈 Monitoring Queries

### Request Rate
```promql
rate(http_requests_total[5m])
```

### Error Rate
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

### 95th Percentile Response Time
```promql
histogram_quantile(0.95, rate(http_requests_duration_seconds_bucket[5m]))
```

### Cache Hit Ratio
```promql
rate(rnode_server_cache_hits_total[5m]) / (rate(rnode_server_cache_hits_total[5m]) + rate(rnode_server_cache_misses_total[5m]))
```

## 🎯 Performance Alerts

```yaml
# High error rate
expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1

# Slow requests
expr: rate(rnode_server_slow_requests_total[5m]) > 0.05

# High CPU usage
expr: rnode_server_process_cpu_usage_percent > 80

# High memory usage
expr: rnode_server_process_memory_kb > 1048576  # 1GB
```

## 📱 Quick Test

```bash
# Start server with metrics
npm run dev

# Check metrics endpoint
curl http://localhost:4546/metrics

# Generate some load
ab -n 1000 -c 10 http://localhost:4546/hello

# Check metrics again
curl http://localhost:4546/metrics | grep http_requests_total
```
