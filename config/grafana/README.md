# HRMS Enterprise Grafana Dashboards

This directory contains comprehensive Grafana dashboards for monitoring the HRMS Enterprise system, including both the main backend and license server components.

## Dashboard Overview

### 1. HRMS Enterprise Overview (`hrms-overview.json`)

**Purpose:** High-level system overview with key metrics
**Folder:** HRMS Enterprise
**Refresh:** 30 seconds

**Key Panels:**

- System Status (Main Backend & License Server)
- Request Rate across both backends
- Response Time (95th percentile)
- Active Licenses count
- System Resources (CPU, Memory)
- Database Connections
- Error Rate monitoring
- Redis Cache Performance
- WebSocket Connections
- License Validation Rate
- Backup Status
- System Alerts

**Use Case:** Executive dashboard for overall system health

### 2. License Management Dashboard (`license-management.json`)

**Purpose:** Detailed license system monitoring
**Folder:** HRMS Enterprise
**Refresh:** 30 seconds

**Key Panels:**

- License Validation Success Rate
- License Validation Duration
- License Validation Errors by Type
- Active Licenses by Module
- Licenses Expiring Soon (30 days)
- Licenses Expiring Critical (7 days)
- Expired Licenses
- Cache Hit Rate
- Usage Limit Warnings
- Usage Limit Exceeded Events
- Usage Limit Percentage by Module
- Module Activations/Deactivations
- Audit Log Entries by Type

**Use Case:** License administrators and compliance monitoring

### 3. System Performance Dashboard (`system-performance.json`)

**Purpose:** Detailed system performance metrics
**Folder:** System Monitoring
**Refresh:** 30 seconds

**Key Panels:**

- Backend Services Status
- CPU Usage (System & Process level)
- Memory Usage (System & Process level)
- Request Rate (req/sec)
- Response Time (95th percentile)
- Error Rate (4xx & 5xx)
- Database Connections
- Redis Performance
- Disk I/O
- Network I/O
- WebSocket Connections
- Process Uptime

**Use Case:** DevOps teams and system administrators

### 4. Business Metrics Dashboard (`business-metrics.json`)

**Purpose:** Business analytics and tenant metrics
**Folder:** Business Analytics
**Refresh:** 5 minutes

**Key Panels:**

- Total Active Tenants
- Total Users Across All Tenants
- Storage Usage (GB)
- Monthly Revenue (MRR)
- API Calls per Hour
- Tenant Growth Over Time
- Top Tenants by User Count
- Top Tenants by Storage Usage
- Top Tenants by API Usage
- Module Usage Distribution
- Revenue by Plan Type
- Churn Rate (Monthly)
- Average Revenue Per User (ARPU)
- Failed Login Attempts (Security)
- Backup Success Rate
- Hours Since Last Backup

**Use Case:** Business stakeholders and product managers

### 5. Alerts & Incidents Dashboard (`alerts-incidents.json`)

**Purpose:** Alert monitoring and incident management
**Folder:** System Monitoring
**Refresh:** 30 seconds

**Key Panels:**

- Critical Alerts Active
- Warning Alerts Active
- System Health Score
- Service Availability (24h)
- Active Alerts Timeline
- Alert Frequency (Last 6h)
- Response Time SLA Violations
- Error Rate Threshold Violations
- Resource Usage Alerts
- License System Health
- Database Health Indicators
- Recent Alert History

**Use Case:** On-call engineers and incident response teams

## Metrics Sources

### Main Backend Metrics (Port 5000)

- **Endpoint:** `http://localhost:5000/metrics`
- **Job Name:** `hrms-main-backend`
- **Metrics Include:**
  - HTTP request metrics
  - System resource usage
  - Database connections
  - WebSocket connections
  - Tenant metrics
  - Module usage

### License Server Metrics (Port 4000)

- **Endpoint:** `http://localhost:4000/metrics`
- **Job Name:** `hrms-license-server`
- **Metrics Include:**
  - License validation metrics
  - License creation/renewal
  - JWT signing operations
  - Cache performance
  - Database operations

### System Metrics

- **Node Exporter:** System-level metrics (CPU, memory, disk, network)
- **MongoDB Exporter:** Database performance metrics
- **Redis Exporter:** Cache performance metrics
- **Nginx Exporter:** Load balancer metrics

## Alert Thresholds

### Critical Alerts

- Service Down (Main Backend or License Server)
- CPU Usage > 80% for 10 minutes
- Memory Usage > 85% for 10 minutes
- Disk Usage > 90% for 5 minutes
- Error Rate > 5% for 5 minutes
- Response Time > 2s (Main Backend) or > 1s (License Server)

### Warning Alerts

- License Expiring within 7 days
- High number of expired licenses (> 10)
- Usage limit warnings (> 80%)
- High WebSocket connections (> 1000)
- Failed backup job

## Dashboard Variables

### Template Variables Available:

- **tenant:** Filter by specific tenant (Business Metrics Dashboard)
- **severity:** Filter alerts by severity level (Alerts Dashboard)

## Grafana Configuration

### Data Sources

- **Prometheus:** Primary metrics source (`http://localhost:9091`)
- **Alertmanager:** Alert status and history

### Provisioning

- Dashboards are automatically provisioned from this directory
- Updates are detected every 10 seconds
- UI updates are allowed for customization

## Usage Guidelines

### For Executives

- Use **HRMS Enterprise Overview** for daily system health checks
- Monitor **Business Metrics Dashboard** for KPIs and growth metrics

### For DevOps Teams

- Use **System Performance Dashboard** for detailed technical monitoring
- Use **Alerts & Incidents Dashboard** for incident response
- Monitor **License Management Dashboard** for license compliance

### For Business Teams

- Use **Business Metrics Dashboard** for tenant analytics
- Monitor revenue, churn, and usage patterns
- Track module adoption and user growth

## Troubleshooting

### Dashboard Not Loading

1. Check Prometheus is running and accessible
2. Verify metrics endpoints are responding
3. Check Grafana logs for errors

### Missing Data

1. Verify Prometheus is scraping targets successfully
2. Check target health in Prometheus UI
3. Ensure metrics are being generated by applications

### Alert Issues

1. Check Alertmanager configuration
2. Verify alert rules in Prometheus
3. Check notification channels

## Maintenance

### Regular Tasks

- Review and update alert thresholds quarterly
- Add new metrics as features are added
- Archive old dashboards when no longer needed
- Update dashboard documentation

### Performance Optimization

- Monitor dashboard query performance
- Optimize slow queries
- Consider data retention policies
- Use appropriate time ranges for different use cases

## Security Considerations

- Dashboards contain sensitive business metrics
- Ensure proper access controls in Grafana
- Monitor dashboard access logs
- Regularly review user permissions

## Support

For dashboard issues or feature requests:

1. Check this documentation first
2. Review Grafana and Prometheus logs
3. Contact the DevOps team
4. Create tickets for new dashboard requirements
