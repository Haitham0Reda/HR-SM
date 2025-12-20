# Logging Configuration and Deployment Setup

This document describes the comprehensive logging configuration and deployment setup implemented for the HR system.

## Overview

The logging configuration system provides:
- Per-company and per-environment logging configuration
- Retention policy management
- Feature toggles for optional logging
- Automated log maintenance and cleanup
- Real-time monitoring and alerting
- Dashboard for system health monitoring

## Components

### 1. Configuration System

#### Files:
- `server/config/logging.config.js` - Core configuration manager
- `server/services/loggingConfiguration.service.js` - Configuration API service
- `server/controllers/loggingConfiguration.controller.js` - REST API controller
- `server/routes/loggingConfiguration.routes.js` - API routes

#### Features:
- **Environment-specific settings**: Different log levels and retention for dev/staging/production
- **Company-specific overrides**: Each company can have custom logging configuration
- **Feature toggles**: Enable/disable optional logging features per company
- **Retention policies**: Configurable retention periods for different log types
- **Alert configuration**: Email, Slack, and webhook alert channels

#### Configuration Structure:
```json
{
  "global": {
    "level": "info",
    "format": "json",
    "enableConsole": true,
    "enableFile": true
  },
  "environments": {
    "production": {
      "level": "warn",
      "enableConsole": false
    }
  },
  "logTypes": {
    "audit": {
      "retentionDays": 2555,
      "tamperProof": true
    },
    "security": {
      "retentionDays": 365,
      "immediateAlert": true
    }
  },
  "features": {
    "userInteractionTracking": {
      "enabled": false,
      "samplingRate": 0.01
    },
    "securityDetection": {
      "enabled": true,
      "realTimeAlerts": true
    }
  }
}
```

### 2. Maintenance and Cleanup Utilities

#### Files:
- `server/services/logMaintenance.service.js` - Core maintenance service
- `server/scripts/logCleanup.js` - Command-line cleanup utility
- `server/scripts/logHealthMonitor.js` - Health monitoring script
- `server/config/cron-jobs.example` - Example cron job configurations

#### Features:
- **Automated log rotation**: Rotate large log files with timestamps
- **Log compression**: Gzip compression for older log files
- **Retention enforcement**: Delete logs based on retention policies
- **Health monitoring**: Generate reports on log system health
- **Statistics collection**: Track file counts, sizes, and compression ratios

#### Usage Examples:
```bash
# Run daily cleanup
node server/scripts/logCleanup.js

# Dry run to see what would be done
node server/scripts/logCleanup.js --dry-run

# Health monitoring with alerts
node server/scripts/logHealthMonitor.js --alert-thresholds --disk-usage

# Company-specific cleanup
node server/scripts/logCleanup.js --company company123
```

### 3. Monitoring and Alerting Infrastructure

#### Files:
- `server/services/loggingMonitoring.service.js` - Real-time monitoring service
- `server/services/alertChannels.service.js` - Multi-channel alert delivery
- `server/controllers/loggingDashboard.controller.js` - Dashboard API
- `server/routes/loggingDashboard.routes.js` - Dashboard routes

#### Features:
- **Real-time monitoring**: Track log volumes, error rates, and system health
- **Threshold-based alerting**: Configurable thresholds for various metrics
- **Multi-channel alerts**: Email, Slack, and webhook notifications
- **Dashboard interface**: Web-based monitoring dashboard
- **Performance tracking**: Monitor logging system performance impact

#### Monitoring Metrics:
- Log volume per minute
- Error rate percentages
- Disk usage levels
- Memory usage
- Response times
- Maintenance service health

## API Endpoints

### Configuration Management
- `GET /api/v1/logging/config/:companyId` - Get company configuration
- `PUT /api/v1/logging/config/:companyId` - Update company configuration
- `PUT /api/v1/logging/config/:companyId/features/:featureName` - Toggle features
- `PUT /api/v1/logging/config/:companyId/retention/:logType` - Update retention
- `GET /api/v1/logging/config/health` - Configuration health check

### Dashboard and Monitoring
- `GET /api/v1/logging/dashboard` - Dashboard overview
- `GET /api/v1/logging/dashboard/monitoring` - Monitoring status
- `POST /api/v1/logging/dashboard/monitoring/start` - Start monitoring
- `GET /api/v1/logging/dashboard/health` - System health
- `GET /api/v1/logging/dashboard/statistics` - Log statistics
- `GET /api/v1/logging/dashboard/alerts` - Recent alerts

## Deployment Setup

### Environment Variables
```bash
# Email configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@company.com
SMTP_PASS=password
SMTP_FROM=noreply@company.com

# Logging configuration
LOGGING_CONFIG_PATH=/path/to/config/logging
NODE_ENV=production
```

### Cron Jobs
Set up automated maintenance using the provided cron job examples:

```bash
# Daily cleanup at 2 AM
0 2 * * * cd /path/to/app && node server/scripts/logCleanup.js

# Hourly health monitoring
0 * * * * cd /path/to/app && node server/scripts/logHealthMonitor.js --alert-thresholds
```

### Directory Structure
```
logs/
├── companies/
│   ├── company1/
│   └── company2/
├── platform/
├── archives/
└── exports/

config/
└── logging/
    ├── global.json
    └── companies/
        ├── company1.json
        └── company2.json
```

## Configuration Examples

### Enable User Interaction Tracking
```bash
curl -X PUT /api/v1/logging/config/company123/features/userInteractionTracking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "config": {"samplingRate": 0.05}}'
```

### Update Retention Policy
```bash
curl -X PUT /api/v1/logging/config/company123/retention/audit \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 90}'
```

### Configure Email Alerts
```bash
curl -X PUT /api/v1/logging/config/company123/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "channels": {
      "email": {
        "enabled": true,
        "recipients": ["admin@company.com"],
        "severity": ["critical", "high"]
      }
    }
  }'
```

## Testing

The system includes comprehensive tests:
- `server/testing/services/loggingConfiguration.service.test.js`
- `server/testing/services/logMaintenance.service.test.js`
- `server/testing/services/loggingMonitoring.service.test.js`

Run tests with:
```bash
npm test -- server/testing/services/loggingConfiguration.service.test.js
```

## Integration

To integrate with existing systems:

1. **Initialize services** in your application startup:
```javascript
import loggingConfigurationService from './services/loggingConfiguration.service.js';
import loggingMonitoringService from './services/loggingMonitoring.service.js';

await loggingConfigurationService.initialize();
await loggingMonitoringService.initialize();
await loggingMonitoringService.startMonitoring();
```

2. **Add routes** to your Express app:
```javascript
import loggingConfigRoutes from './routes/loggingConfiguration.routes.js';
import loggingDashboardRoutes from './routes/loggingDashboard.routes.js';

app.use('/api/v1/logging', loggingConfigRoutes);
app.use('/api/v1/logging', loggingDashboardRoutes);
```

3. **Use configuration** in your loggers:
```javascript
const config = loggingConfigurationService.getCompanyLoggingConfig('company123');
const isFeatureEnabled = loggingConfigurationService.isFeatureEnabled('securityDetection', 'company123');
```

## Troubleshooting

### Common Issues

1. **Configuration not loading**: Check file permissions and paths
2. **Alerts not sending**: Verify SMTP settings and webhook URLs
3. **High disk usage**: Run maintenance cleanup or adjust retention policies
4. **Monitoring not starting**: Check for port conflicts and dependencies

### Health Checks

Use the health monitoring script to diagnose issues:
```bash
node server/scripts/logHealthMonitor.js --verbose --disk-usage --alert-thresholds
```

### Log Locations

- Configuration logs: Check console output during startup
- Maintenance logs: `/var/log/log-cleanup.log` (if using cron)
- Health reports: `/tmp/log-health-report.json`
- Application logs: `logs/` directory structure