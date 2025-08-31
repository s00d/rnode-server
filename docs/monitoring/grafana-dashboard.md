# Grafana Dashboard for RNode Server

This document provides a complete Grafana dashboard configuration for monitoring RNode Server metrics.

## 📊 Dashboard Overview

The dashboard includes:
- **HTTP Performance**: Request rates, response times, status codes
- **WebSocket Monitoring**: Connection rates, message throughput, error tracking
- **System Resources**: CPU, memory, uptime
- **Business Metrics**: Cache performance, slow requests
- **Real-time Monitoring**: Live updates every 15 seconds

## 🚀 Quick Setup

### 1. Install Prometheus

```bash
# Using Docker
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'rnode-server'
    static_configs:
      - targets: ['localhost:4546']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 3. Install Grafana

```bash
# Using Docker
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

### 4. Import Dashboard

1. Open Grafana: `http://localhost:3000`
2. Login: `admin/admin`
3. Go to **Dashboards** → **Import**
4. Copy the JSON below and paste it

## 📋 Dashboard JSON

```json
{
  "dashboard": {
    "id": null,
    "title": "RNode Server Metrics",
    "tags": ["rnode-server", "rust", "nodejs"],
    "style": "dark",
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "HTTP Requests Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{path}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "displayMode": "list"
            },
            "unit": "reqps"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Request Duration (95th percentile)",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_requests_duration_seconds_bucket[5m]))",
            "legendFormat": "{{method}} {{path}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 0.5},
                {"color": "red", "value": 1.0}
              ]
            },
            "unit": "s"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "HTTP Status Codes",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (status)",
            "legendFormat": "{{status}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "System CPU Usage",
        "type": "gauge",
        "targets": [
          {
            "expr": "rnode_server_process_cpu_usage_percent",
            "legendFormat": "CPU %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 70},
                {"color": "red", "value": 90}
              ]
            },
            "unit": "percent",
            "max": 100
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 16}
      },
      {
        "id": 5,
        "title": "Memory Usage",
        "type": "gauge",
        "targets": [
          {
            "expr": "rnode_server_process_memory_kb / 1024",
            "legendFormat": "Memory MB"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 512},
                {"color": "red", "value": 1024}
              ]
            },
            "unit": "MB"
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 8, "y": 16}
      },
      {
        "id": 6,
        "title": "Server Uptime",
        "type": "stat",
        "targets": [
          {
            "expr": "rnode_server_uptime_seconds",
            "legendFormat": "Uptime"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "s"
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 16, "y": 16}
      },
      {
        "id": 7,
        "title": "Request Duration Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "sum(rate(http_requests_duration_seconds_bucket[5m])) by (le, method, path)",
            "format": "heatmap"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 24}
      },
      {
        "id": 8,
        "title": "Slow Requests",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(rnode_server_slow_requests_total[5m])",
            "legendFormat": "{{method}} {{path}} - {{duration_range}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "reqps"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 32}
      },
      {
        "id": 9,
        "title": "Cache Performance",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(rnode_server_cache_hits_total[5m])",
            "legendFormat": "Cache Hits"
          },
          {
            "expr": "rate(rnode_server_cache_misses_total[5m])",
            "legendFormat": "Cache Misses"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "reqps"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 32}
      },
      {
        "id": 10,
        "title": "Pending Requests",
        "type": "stat",
        "targets": [
          {
            "expr": "rnode_server_pending_requests",
            "legendFormat": "Pending"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 10},
                {"color": "red", "value": 50}
              ]
            },
            "unit": "short"
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 40}
      },
      {
        "id": 11,
        "title": "Total Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "rnode_server_total_connections",
            "legendFormat": "Connections"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "short"
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 8, "y": 40}
      },
      {
        "id": 12,
        "title": "System Memory",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rnode_server_system_memory_used_mb",
            "legendFormat": "Used Memory"
          },
          {
            "expr": "rnode_server_system_memory_total_mb",
            "legendFormat": "Total Memory"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "MB"
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 16, "y": 40}
      },
      {
        "id": 14,
        "title": "WebSocket Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "rnode_server_websocket_connections_active",
            "legendFormat": "Active Connections"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "displayMode": "list"
            },
            "unit": "short"
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 48}
      },
      {
        "id": 15,
        "title": "WebSocket Connection Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(rnode_server_websocket_connections_total[5m])",
            "legendFormat": "Connections/sec"
          },
          {
            "expr": "rate(rnode_server_websocket_disconnections_total[5m])",
            "legendFormat": "Disconnections/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "connps"
          }
        },
        "gridPos": {"h": 8, "w": 16, "x": 8, "y": 48}
      },
      {
        "id": 16,
        "title": "WebSocket Message Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(rnode_server_websocket_messages_sent_total[5m])",
            "legendFormat": "Sent"
          },
          {
            "expr": "rate(rnode_server_websocket_messages_received_total[5m])",
            "legendFormat": "Received"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "msgps"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 56}
      },
      {
        "id": 17,
        "title": "WebSocket Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(rnode_server_websocket_errors_total[5m])",
            "legendFormat": "Errors/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "unit": "errps"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 56}
      },
      {
        "id": 18,
        "title": "WebSocket Rooms",
        "type": "stat",
        "targets": [
          {
            "expr": "rnode_server_websocket_rooms_total",
            "legendFormat": "Total Rooms"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "displayMode": "list"
            },
            "unit": "short"
          }
        },
        "gridPos": {"h": 8, "w": 8, "x": 0, "y": 64}
      },
      {
        "id": 19,
        "title": "Room Connections",
        "type": "table",
        "targets": [
          {
            "expr": "rnode_server_websocket_room_connections",
            "format": "table",
            "instant": true
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "displayMode": "list"
            }
          }
        },
        "gridPos": {"h": 8, "w": 16, "x": 8, "y": 64}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "15s"
  }
}
```

## 🔧 Customization

### Add Custom Metrics

```typescript
// In your handler
import { record_cache_hit, record_cache_miss } from 'rnode-server';

app.get('/api/data', (req, res) => {
  if (cache.has(req.query.key)) {
    record_cache_hit();
    res.json(cache.get(req.query.key));
  } else {
    record_cache_miss();
    const data = fetchData(req.query.key);
    cache.set(req.query.key, data);
    res.json(data);
  }
});
```

### Custom Alerts

```yaml
# prometheus/alerts.yml
groups:
  - name: rnode-server
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          
      - alert: SlowRequests
        expr: rate(rnode_server_slow_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Too many slow requests"
          
      - alert: HighWebSocketErrorRate
        expr: rate(rnode_server_websocket_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High WebSocket error rate detected"
          
      - alert: WebSocketConnectionDrop
        expr: rate(rnode_server_websocket_disconnections_total[5m]) > rate(rnode_server_websocket_connections_total[5m]) * 0.8
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "WebSocket connections dropping rapidly"
          
      - alert: WebSocketMessageQueue
        expr: rate(rnode_server_websocket_messages_received_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High WebSocket message rate"
```

## 📱 Mobile Dashboard

The dashboard is responsive and works on mobile devices. Key metrics are displayed in compact panels suitable for small screens.

## 🚨 Troubleshooting

### Metrics Not Showing

1. Check if metrics are enabled: `app.createApp({ metrics: true })`
2. Verify endpoint: `curl http://localhost:4546/metrics`
3. Check Prometheus targets: `http://localhost:9090/targets`

### High Memory Usage

- Monitor `rnode_server_process_memory_kb`
- Check for memory leaks in handlers
- Consider increasing system memory

### Slow Response Times

- Monitor `http_requests_duration_seconds`
- Check `rnode_server_slow_requests_total`
- Optimize database queries and external API calls

### WebSocket Issues

- Monitor `rnode_server_websocket_errors_total` for error patterns
- Check `rnode_server_websocket_connection_duration_seconds` for connection stability
- Monitor `rnode_server_websocket_messages_sent_total` vs `rnode_server_websocket_messages_received_total` for message flow
- Check `rnode_server_websocket_room_connections` for room distribution
