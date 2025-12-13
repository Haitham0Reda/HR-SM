# License Monitoring Quick Start Guide

## Overview

The HRMS License Management system includes comprehensive monitoring and alerting capabilities to help you track license usage, expiration, and system health.

## Key Features

✅ **Real-time Metrics**: Prometheus metrics exposed at `/api/v1/metrics`  
✅ **Automated Alerts**: Email notifications for license expiration and usage limits  
✅ **Visual Dashboards**: Pre-configured Grafana dashboard  
✅ **Scheduled Checks**: Daily license expiration checks at 9:00 AM  
✅ **Usage Tracking**: 80% threshold warnings for all usage limits  

## Quick Setup (5 Minutes)

### 1. Enable Email Alerts

Add to your `.env` file:

```env
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_ADDRESS=admin@yourcompany.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. Access Metrics

```bash
# View raw metrics
curl http://localhost:5000/api/v1/metrics

# View alert statistics
curl http://localhost:5000/api/v1/metrics/alerts/stats
```

### 3. Manual Alert Check

```bash
# Trigger license expiration check
curl -X POST http://localhost:5000/api/v1/metrics/alerts/check-expiration
```

## Alert Types

### License Expiration Alerts

| Alert | Trigger | Severity |
|-------|---------|----------|
| 30-day warning | License expires in 30 days | Warning |
| 7-day critical | License expires in 7 days | Critical |
| Expired | License has expired | Critical |

### Usage Limit Alerts

| Alert | Trigger | Severity |
|-------|---------|----------|
| 80% warning | Usage reaches 80% of limit | Warning |
| 95% critical | Usage reaches 95% of limit | Critical |
| Limit exceeded | Usage exceeds limit | Critical |

## Monitoring Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/metrics` | GET | Prometheus metrics |
| `/api/v1/metrics/alerts/stats` | GET | Alert statistics |
| `/api/v1/metrics/alerts/check-expiration` | POST | Manual expiration check |

## Key Metrics

### License Validation
- `license_validation_total` - Total validation attempts
- `license_validation_duration_seconds` - Validation duration
- `license_validation_errors_total` - Validation errors

### License Status
- `license_expiring_count` - Licenses expiring soon
- `license_expired_count` - Expired licenses
- `active_licenses_count` - Active licenses

### Usage Limits
- `usage_limit_percentage` - Current usage percentage
- `usage_limit_warnings_total` - Warning count
- `usage_limit_exceeded_total` - Exceeded count

### Performance
- `license_cache_hits_total` - Cache hits
- `license_cache_misses_total` - Cache misses

## Scheduled Jobs

### Daily License Check (9:00 AM)
- Checks all licenses for expiration
- Sends email alerts for licenses expiring within 30 or 7 days
- Updates expiration metrics

### Hourly Metrics Update
- Updates license counts by module and tier
- Refreshes expiration statistics
- Updates active license gauges

## Alert Cooldown

To prevent alert spam, the system implements a 24-hour cooldown:
- Same alert won't be sent more than once per 24 hours
- Applies to both email and metrics-based alerts
- Cooldown resets when alert condition changes

## Grafana Dashboard (Optional)

For visual monitoring, set up Grafana:

1. Install Grafana and Prometheus
2. Import dashboard from `server/config/grafana-dashboard.json`
3. Configure Prometheus data source
4. View real-time metrics and alerts

See [MONITORING_SETUP.md](./MONITORING_SETUP.md) for detailed instructions.

## Troubleshooting

### No Alerts Received

1. Check email configuration in `.env`
2. Verify SMTP credentials
3. Check application logs: `logs/application.log`
4. Test SMTP connection manually

### Metrics Not Updating

1. Verify server is running
2. Check `/api/v1/metrics` endpoint
3. Review server logs for errors
4. Ensure monitoring job started successfully

### High Alert Volume

1. Review alert cooldown settings
2. Check for actual license/usage issues
3. Adjust alert thresholds if needed
4. Consider increasing cooldown period

## Best Practices

1. **Monitor Daily**: Check dashboard or metrics daily
2. **Act on Warnings**: Address 30-day warnings promptly
3. **Track Usage**: Monitor usage trends to predict needs
4. **Test Alerts**: Periodically test alert delivery
5. **Review Logs**: Check audit logs for patterns

## Support

For monitoring issues:
1. Check `logs/application.log` for errors
2. Review alert statistics endpoint
3. Verify email configuration
4. Contact system administrator

## Next Steps

- Set up Prometheus and Grafana for advanced monitoring
- Configure additional alert channels (Slack, PagerDuty)
- Customize alert thresholds for your needs
- Set up log aggregation for better troubleshooting

For detailed setup instructions, see [MONITORING_SETUP.md](./MONITORING_SETUP.md).
