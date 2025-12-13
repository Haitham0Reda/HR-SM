# License Monitoring Reference Card

## Quick Access

| Resource | URL |
|----------|-----|
| Metrics Endpoint | `http://localhost:5000/api/v1/metrics` |
| Alert Stats | `http://localhost:5000/api/v1/metrics/alerts/stats` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3001` |
| Alertmanager | `http://localhost:9093` |

## Key Metrics

```promql
# License validation success rate
rate(license_validation_total{result="success"}[5m]) / rate(license_validation_total[5m]) * 100

# Licenses expiring soon
sum(license_expiring_count{days_until_expiration="30"})

# Usage percentage
usage_limit_percentage{tenant_id="...", module_key="...", limit_type="..."}

# Cache hit rate
rate(license_cache_hits_total[5m]) / (rate(license_cache_hits_total[5m]) + rate(license_cache_misses_total[5m])) * 100
```

## Alert Thresholds

| Alert | Threshold | Severity |
|-------|-----------|----------|
| License Expiring | 30 days | Warning |
| License Expiring | 7 days | Critical |
| License Expired | 0 days | Critical |
| Usage Warning | 80% | Warning |
| Usage Critical | 95% | Critical |
| Usage Exceeded | 100% | Critical |
| Validation Failure | >10% | Warning |
| Slow Validation | >1s | Warning |
| Cache Hit Rate | <50% | Warning |

## Manual Commands

```bash
# View metrics
curl http://localhost:5000/api/v1/metrics

# Check alert stats
curl http://localhost:5000/api/v1/metrics/alerts/stats

# Trigger expiration check
curl -X POST http://localhost:5000/api/v1/metrics/alerts/check-expiration

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check active alerts
curl http://localhost:9090/api/v1/alerts
```

## Environment Variables

```env
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_ADDRESS=admin@company.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app-password
```

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| License Expiration Check | Daily 9:00 AM | Checks licenses, sends alerts |
| Metrics Update | Every hour | Updates license metrics |

## Common Issues

| Issue | Solution |
|-------|----------|
| No metrics | Check `/api/v1/metrics` endpoint |
| No alerts | Verify SMTP configuration |
| Prometheus not scraping | Check `prometheus.yml` config |
| Dashboard not loading | Verify Grafana data source |

## Support Contacts

- System Admin: Check `.env` for `ALERT_EMAIL_ADDRESS`
- Documentation: `docs/MONITORING_SETUP.md`
- Logs: `logs/application.log`
