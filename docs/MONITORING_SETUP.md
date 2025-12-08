# HRMS License Management Monitoring Setup

This guide explains how to set up comprehensive monitoring and alerting for the HRMS License Management system using Prometheus and Grafana.

## Overview

The monitoring system provides:
- Real-time metrics on license validation performance
- Alerts for license expiration (30-day and 7-day warnings)
- Usage limit monitoring with 80% threshold warnings
- Cache performance metrics
- Audit log tracking
- Module activation/deactivation monitoring

## Architecture

```
┌─────────────┐
│  HRMS API   │ ──► Exposes metrics at /api/v1/metrics
└─────────────┘
       │
       ▼
┌─────────────┐
│ Prometheus  │ ──► Scrapes metrics, evaluates alerts
└─────────────┘
       │
       ├──► ┌──────────────┐
       │    │ Alertmanager │ ──► Sends email/Slack alerts
       │    └──────────────┘
       │
       └──► ┌─────────────┐
            │   Grafana   │ ──► Visualizes metrics
            └─────────────┘
```

## Prerequisites

- Docker and Docker Compose (recommended) OR
- Prometheus, Grafana, and Alertmanager installed locally
- HRMS API running and accessible

## Quick Start with Docker Compose

### 1. Create docker-compose.yml

Create a `docker-compose.monitoring.yml` file in your project root:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: hrms-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./server/config/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./server/config/prometheus-alerts.yml:/etc/prometheus/prometheus-alerts.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: hrms-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./server/config/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: hrms-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./server/config/grafana-dashboard.json:/etc/grafana/provisioning/dashboards/hrms-license.json
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus-data:
  alertmanager-data:
  grafana-data:
```

### 2. Start Monitoring Stack

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 3. Access Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Alertmanager**: http://localhost:9093

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Alert Email Configuration
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_ADDRESS=admin@yourcompany.com

# SMTP Configuration (for email alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourcompany.com
```

### Alertmanager Configuration

Create `server/config/alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alertmanager@yourcompany.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'email-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'admin@yourcompany.com'
        headers:
          Subject: '[HRMS] {{ .GroupLabels.alertname }}'

  - name: 'critical-alerts'
    email_configs:
      - to: 'admin@yourcompany.com,ops@yourcompany.com'
        headers:
          Subject: '[CRITICAL] HRMS License Alert'
        send_resolved: true

  - name: 'warning-alerts'
    email_configs:
      - to: 'admin@yourcompany.com'
        headers:
          Subject: '[WARNING] HRMS License Alert'
        send_resolved: true
```

## Metrics Reference

### License Validation Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `license_validation_total` | Counter | Total license validation attempts |
| `license_validation_duration_seconds` | Histogram | Duration of validation operations |
| `license_validation_errors_total` | Counter | Total validation errors |

### License Expiration Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `license_expiring_count` | Gauge | Licenses expiring within N days |
| `license_expired_count` | Gauge | Number of expired licenses |

### Usage Limit Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `usage_limit_percentage` | Gauge | Current usage as % of limit |
| `usage_limit_warnings_total` | Counter | Usage limit warnings (>80%) |
| `usage_limit_exceeded_total` | Counter | Times limits were exceeded |

### Cache Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `license_cache_hits_total` | Counter | Cache hits |
| `license_cache_misses_total` | Counter | Cache misses |

### Module Activity Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `module_activations_total` | Counter | Module activations |
| `module_deactivations_total` | Counter | Module deactivations |
| `active_licenses_count` | Gauge | Currently active licenses |

## Alert Rules

### Critical Alerts

1. **LicenseValidationSystemDown**: No validation attempts in 5 minutes
2. **LicenseExpiringCritical**: Licenses expiring within 7 days
3. **LicenseExpired**: Expired licenses detected
4. **UsageLimitCritical**: Usage at 95% or higher
5. **UsageLimitExceeded**: Usage limit exceeded

### Warning Alerts

1. **HighLicenseValidationFailureRate**: >10% failure rate
2. **SlowLicenseValidation**: 95th percentile >1 second
3. **LicenseExpiringWarning**: Licenses expiring within 30 days
4. **UsageLimitWarning**: Usage at 80-95%
5. **LowCacheHitRate**: Cache hit rate <50%

## Grafana Dashboard

### Import Dashboard

1. Log in to Grafana (http://localhost:3001)
2. Go to Dashboards → Import
3. Upload `server/config/grafana-dashboard.json`
4. Select Prometheus as the data source

### Dashboard Panels

The dashboard includes:
- License validation success rate
- Validation duration (p50, p95)
- Validation errors by type
- Active licenses by module
- License expiration warnings
- Cache hit rate
- Usage limit percentages
- Module activations/deactivations
- Audit log entries

## Scheduled Jobs

The system runs automated monitoring jobs:

### License Expiration Check
- **Schedule**: Daily at 9:00 AM
- **Function**: Checks all licenses and sends expiration alerts
- **Manual trigger**: `POST /api/v1/metrics/alerts/check-expiration`

### Metrics Update
- **Schedule**: Every hour
- **Function**: Updates license and usage metrics

## Testing Alerts

### Test License Expiration Alert

```bash
# Manually trigger expiration check
curl -X POST http://localhost:5000/api/v1/metrics/alerts/check-expiration
```

### Test Usage Limit Alert

```javascript
// In your application, simulate high usage
await usageTracker.trackUsage(tenantId, 'attendance', 'employees', 85);
```

### View Alert Status

```bash
# Check Prometheus alerts
curl http://localhost:9090/api/v1/alerts

# Check Alertmanager
curl http://localhost:9093/api/v1/alerts
```

## Troubleshooting

### Metrics Not Appearing

1. Check if metrics endpoint is accessible:
   ```bash
   curl http://localhost:5000/api/v1/metrics
   ```

2. Verify Prometheus is scraping:
   - Go to http://localhost:9090/targets
   - Check if `hrms-api` target is UP

3. Check Prometheus logs:
   ```bash
   docker logs hrms-prometheus
   ```

### Alerts Not Firing

1. Check alert rules in Prometheus:
   - Go to http://localhost:9090/alerts
   - Verify rules are loaded

2. Check Alertmanager configuration:
   ```bash
   docker logs hrms-alertmanager
   ```

3. Verify email configuration in `.env`

### Dashboard Not Loading

1. Check Grafana logs:
   ```bash
   docker logs hrms-grafana
   ```

2. Verify Prometheus data source:
   - Go to Configuration → Data Sources
   - Test connection to Prometheus

## Production Recommendations

1. **Persistent Storage**: Use named volumes for data persistence
2. **Security**: 
   - Change default Grafana password
   - Use authentication for Prometheus
   - Restrict network access
3. **Backup**: Regularly backup Prometheus data and Grafana dashboards
4. **Scaling**: Consider Prometheus federation for multi-region deployments
5. **Retention**: Configure appropriate data retention policies

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)

## Support

For issues or questions:
1. Check application logs: `logs/application.log`
2. Check Prometheus logs
3. Review alert history in Alertmanager
4. Contact system administrator
