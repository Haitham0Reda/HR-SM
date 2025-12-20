# HR-SM Backup and Disaster Recovery System

## Overview

The HR-SM Backup and Disaster Recovery System provides comprehensive, enterprise-grade backup and recovery capabilities for the HR-SM platform. This system ensures business continuity through automated backups, cloud storage integration, database repair procedures, and comprehensive verification processes.

## 🎯 Key Features

### Automated Daily Backups
- **Complete System Backup**: All MongoDB databases (hrms + hrsm-licenses)
- **File Uploads**: All user-uploaded files and documents
- **Configuration Files**: Environment files, PM2 configs, Nginx settings
- **License Server RSA Keys**: Encrypted backup of critical security keys
- **Application Code**: Source code and dependencies backup
- **Retention Policies**: 30 days daily, 12 weeks weekly, 12 months monthly

### Cloud Storage Integration
- **AWS S3 Support**: Automated upload to S3 with encryption
- **Multi-Provider Ready**: Extensible for Google Cloud and Azure
- **Verification**: Automated integrity checking of cloud uploads
- **Monitoring**: Failed upload alerts and retry mechanisms

### Database Recovery
- **Corruption Detection**: Automated MongoDB integrity checking
- **Repair Procedures**: Database compaction, index rebuilding, collection repair
- **Recovery Workflows**: Automated restoration from backups
- **Safety Backups**: Emergency backups before repair operations

### Comprehensive Verification
- **Multi-Phase Testing**: File integrity, component verification, cloud storage
- **Restoration Testing**: Full backup restoration validation
- **Automated Scheduling**: Regular verification of recent backups
- **Detailed Reporting**: Comprehensive verification reports with recommendations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backup System Architecture               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Backup Service │    │ Cloud Storage   │                │
│  │                 │    │ Service         │                │
│  │ • Daily Backups │    │ • AWS S3        │                │
│  │ • Compression   │    │ • Verification  │                │
│  │ • Encryption    │    │ • Monitoring    │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                       │                        │
│           └───────────┬───────────┘                        │
│                       │                                    │
│  ┌─────────────────┐  │  ┌─────────────────┐              │
│  │ Database        │  │  │ Verification    │              │
│  │ Recovery        │  │  │ System          │              │
│  │                 │  │  │                 │              │
│  │ • Corruption    │  │  │ • Multi-Phase   │              │
│  │   Detection     │  │  │ • Restoration   │              │
│  │ • Repair        │  │  │   Testing       │              │
│  │ • Restoration   │  │  │ • Reporting     │              │
│  └─────────────────┘  │  └─────────────────┘              │
│                       │                                    │
│           ┌───────────┴───────────┐                        │
│           │                       │                        │
│  ┌─────────────────┐    ┌─────────────────┐              │
│  │ Backup          │    │ Monitoring &    │              │
│  │ Scheduler       │    │ Alerting        │              │
│  │                 │    │                 │              │
│  │ • Cron Jobs     │    │ • Health Checks │              │
│  │ • Retention     │    │ • Email Alerts  │              │
│  │ • Key Rotation  │    │ • Daily Reports │              │
│  └─────────────────┘    └─────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Environment Configuration

Create or update your `.env` file with backup configuration:

```bash
# Backup Configuration
BACKUPS_ENABLED=true
BACKUP_ENCRYPTION_KEY=your-32-character-hex-key
BACKUP_TIMEZONE=UTC

# Cloud Storage (AWS S3)
BACKUP_CLOUD_ENABLED=true
BACKUP_CLOUD_PROVIDER=aws-s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BACKUP_BUCKET=your-backup-bucket

# Email Alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
BACKUP_ALERT_EMAILS=admin@company.com,ops@company.com
BACKUP_DAILY_REPORT_EMAILS=reports@company.com
```

### 2. Start Backup System

The backup system starts automatically with the main application:

```bash
npm start
```

Or start the backup scheduler independently:

```bash
npm run backup:start-scheduler
```

### 3. Create Manual Backup

```bash
# Create a manual backup
npm run backup:create

# Create with verbose output
npm run backup:create -- --verbose
```

## 📋 Available Commands

### Backup Management

```bash
# Create manual backup
npm run backup:create

# List recent backups
npm run backup:list

# Show backup statistics
npm run backup:stats

# Start backup scheduler
npm run backup:start-scheduler

# Stop backup scheduler
npm run backup:stop-scheduler

# Clean up old backups
npm run backup:cleanup
```

### Database Recovery

```bash
# Detect database corruption
npm run recovery:detect [database]

# Repair database corruption
npm run recovery:repair <database>

# Restore from backup
npm run recovery:restore <backupId>

# List available backups
npm run recovery:list-backups

# Show recovery statistics
npm run recovery:stats

# Clean up recovery files
npm run recovery:cleanup
```

### Backup Verification

```bash
# Verify specific backup
npm run verify:backup <backupId>

# Run automated verification
npm run verify:auto

# List verification reports
npm run verify:list

# Show verification system status
npm run verify:status

# Update verification schedule
npm run verify:schedule --daily true --restoration-test false
```

## 🔧 Configuration

### Backup Schedule

The system runs automated backups on the following schedule:

- **Daily Backup**: 2:00 AM UTC
- **Weekly Backup**: Sunday 3:00 AM UTC
- **Monthly Backup**: 1st of month 4:00 AM UTC
- **Cleanup**: Daily 5:00 AM UTC
- **Key Rotation**: 15th of month 6:00 AM UTC

### Retention Policies

- **Daily Backups**: 30 days
- **Weekly Backups**: 12 weeks (84 days)
- **Monthly Backups**: 12 months (365 days)
- **Emergency Backups**: 6 months

### Cloud Storage

AWS S3 configuration:
- **Encryption**: Server-side AES-256
- **Storage Class**: Standard
- **Versioning**: Enabled
- **Lifecycle**: Transition to IA after 30 days

## 📊 Monitoring and Alerts

### Health Monitoring

The system continuously monitors:
- Backup success/failure rates
- Time since last successful backup
- Cloud storage upload status
- Database integrity
- Storage space usage

### Alert Thresholds

- **Critical**: No backup in 26+ hours
- **Critical**: Failure rate > 30%
- **Critical**: 3+ failures in 24 hours
- **Warning**: No backup in 24+ hours
- **Warning**: Failure rate > 10%

### Daily Reports

Automated daily reports include:
- Backup summary (success/failure counts)
- Total backup size and duration
- Cloud storage status
- Recommendations for issues

## 🔍 Verification System

### Verification Phases

1. **Basic Integrity**: File existence, size, checksums
2. **Component Verification**: Database, files, configs, keys
3. **Cloud Storage**: Upload integrity, download capability
4. **Database Content**: Structure and critical data presence
5. **Restoration Test**: Full backup restoration (optional)

### Verification Scoring

- **90-100**: Excellent - Backup fully verified
- **80-89**: Good - Minor issues, backup reliable
- **60-79**: Warning - Some issues, review recommended
- **0-59**: Critical - Significant issues, backup unreliable

## 🚨 Disaster Recovery Procedures

### Complete System Recovery

1. **Assess Damage**
   ```bash
   npm run recovery:detect
   ```

2. **Create Emergency Backup** (if possible)
   ```bash
   npm run backup:create
   ```

3. **Find Latest Good Backup**
   ```bash
   npm run recovery:list-backups
   ```

4. **Restore Database**
   ```bash
   npm run recovery:restore <backupId>
   ```

5. **Verify Restoration**
   ```bash
   npm run verify:backup <backupId>
   ```

### Database Corruption Recovery

1. **Detect Corruption**
   ```bash
   npm run recovery:detect hrms
   ```

2. **Attempt Repair**
   ```bash
   npm run recovery:repair hrms --verbose
   ```

3. **If Repair Fails, Restore**
   ```bash
   npm run recovery:restore <backupId> --database hrms
   ```

### License Server Recovery

1. **Check License Database**
   ```bash
   npm run recovery:detect hrsm-licenses
   ```

2. **Restore License Database**
   ```bash
   npm run recovery:restore <backupId> --database hrsm-licenses
   ```

3. **Verify RSA Keys**
   ```bash
   ls -la hrsm-license-server/keys/
   ```

## 📁 File Structure

```
backups/
├── daily/                    # Daily backups
├── weekly/                   # Weekly backups
├── monthly/                  # Monthly backups
├── metadata/                 # Backup metadata files
├── temp/                     # Temporary files during backup
├── staging/                  # Verification staging area
└── verification/             # Verification reports

recovery/
├── temp/                     # Temporary restoration files
└── *.archive                 # Emergency backup files

logs/
├── backup.log               # Backup operations log
├── backup-scheduler.log     # Scheduler log
├── cloud-storage.log        # Cloud operations log
├── database-recovery.log    # Recovery operations log
└── backup-verification-system.log  # Verification log
```

## 🔐 Security Considerations

### Encryption

- **Backup Files**: AES-256-CBC encryption
- **RSA Keys**: Separately encrypted in backups
- **Cloud Storage**: Server-side encryption enabled
- **Key Rotation**: Monthly encryption key rotation

### Access Control

- **Backup Files**: Restricted file permissions (600)
- **Cloud Storage**: IAM policies with minimal permissions
- **Database Access**: Authenticated connections only
- **API Keys**: Environment variables, never in code

### Audit Trail

- All backup operations logged
- Recovery operations tracked
- Verification results stored
- Access attempts monitored

## 🚀 Performance Optimization

### Backup Performance

- **Compression**: gzip level 6 for optimal size/speed
- **Parallel Processing**: Multiple components backed up simultaneously
- **Incremental Options**: Future enhancement for large datasets
- **Network Optimization**: Chunked uploads for large files

### Storage Optimization

- **Deduplication**: Planned for future releases
- **Compression Ratios**: Typically 60-80% size reduction
- **Cloud Tiering**: Automatic transition to cheaper storage classes
- **Cleanup Automation**: Automatic removal of expired backups

## 🔧 Troubleshooting

### Common Issues

#### Backup Fails with "Permission Denied"
```bash
# Check backup directory permissions
ls -la backups/
chmod 755 backups/
```

#### Cloud Upload Fails
```bash
# Test AWS credentials
aws s3 ls s3://your-backup-bucket/

# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
```

#### Database Backup Empty
```bash
# Check MongoDB connection
mongosh $MONGODB_URI

# Verify database exists
show dbs
```

#### Verification Fails
```bash
# Check backup file integrity
npm run verify:backup <backupId> --verbose

# Manual file check
ls -la backups/daily/
```

### Log Analysis

```bash
# View backup logs
tail -f logs/backup.log

# Search for errors
grep -i error logs/backup*.log

# Check scheduler status
grep -i "scheduler" logs/backup-scheduler.log
```

## 📈 Monitoring Integration

### Prometheus Metrics

The system exposes metrics for monitoring:

```
backup_total_count
backup_success_rate
backup_avg_duration
backup_avg_size
backup_last_success
backup_health_score
```

### Grafana Dashboard

Import the provided dashboard configuration:
- Backup success rates over time
- Storage usage trends
- Recovery time objectives
- Alert frequency

## 🔄 Maintenance

### Weekly Tasks

- Review backup success rates
- Check cloud storage costs
- Verify alert configurations
- Test recovery procedures

### Monthly Tasks

- Rotate encryption keys
- Review retention policies
- Update disaster recovery documentation
- Conduct full recovery test

### Quarterly Tasks

- Review and update RTO/RPO targets
- Audit backup security settings
- Performance optimization review
- Disaster recovery plan testing

## 📞 Support

For backup and recovery support:

1. **Check Logs**: Review relevant log files
2. **Run Diagnostics**: Use built-in verification tools
3. **Emergency Recovery**: Follow disaster recovery procedures
4. **Documentation**: Refer to this guide and inline help

### Emergency Contacts

- **System Administrator**: [Contact Info]
- **Database Administrator**: [Contact Info]
- **Cloud Operations**: [Contact Info]
- **Security Team**: [Contact Info]

---

## 📚 Additional Resources

- [MongoDB Backup Best Practices](https://docs.mongodb.com/manual/core/backups/)
- [AWS S3 Security Guide](https://docs.aws.amazon.com/s3/latest/userguide/security.html)
- [Disaster Recovery Planning](https://www.ready.gov/business/implementation/IT)
- [Node.js Backup Strategies](https://nodejs.org/en/docs/guides/backups/)

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: HR-SM Development Team