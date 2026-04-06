# PostgreSQL Backup and Restore Guide

## Overview

This guide covers backup and restore procedures for PostgreSQL databases in the HR-SM application. The system supports automated backups, manual backups, encryption, compression, and flexible restore options.

## Components

### 1. PostgreSQL Backup Service
**Location**: `server/modules/hr-core/backup/services/postgresBackup.service.js`

Production-ready backup service with:
- pg_dump integration for reliable backups
- Support for both License Server and Main Application databases
- Multiple backup formats (custom, plain SQL, tar, directory)
- Compression (gzip)
- Encryption (AES-256-CBC)
- Checksum verification
- Backup retention policies

### 2. Restore Script
**Location**: `scripts/restore-postgres-backup.js`

Command-line tool for restoring backups with:
- Automatic format detection
- Decryption support
- Decompression support
- Safety confirmations
- Verbose output options

### 3. Backup Scheduler
**Location**: `scripts/schedule-postgres-backups.js`

Automated backup scheduling with:
- Cron-based scheduling (daily, weekly, monthly)
- Configurable backup times
- Automatic cleanup of old backups
- Alert notifications
- Test mode for validation

## Quick Start

### Manual Backup

```bash
# Backup both databases
node -e "
  import('./server/modules/hr-core/backup/services/postgresBackup.service.js')
    .then(m => m.default.performFullBackup({settings:{}}, './backups', new Date().toISOString()))
"

# Backup license server only
node scripts/backup-postgres.js --database=license

# Backup main application only
node scripts/backup-postgres.js --database=main

# Backup with encryption
node scripts/backup-postgres.js --encrypt
```

### Restore Backup

```bash
# Restore from backup (auto-detect database)
node scripts/restore-postgres-backup.js backups/database-main_app-2026-04-06.dump.gz

# Restore specific database
node scripts/restore-postgres-backup.js backups/database-license_server-2026-04-06.dump.gz --database=license

# Restore with drop existing
node scripts/restore-postgres-backup.js backups/database-main_app-2026-04-06.dump.gz --drop-existing

# Restore with verbose output
node scripts/restore-postgres-backup.js backups/database-main_app-2026-04-06.dump.gz --verbose
```

### Schedule Automated Backups

```bash
# Daily backups at 2:00 AM
node scripts/schedule-postgres-backups.js

# Weekly backups at 3:00 AM on Sundays
node scripts/schedule-postgres-backups.js --schedule=weekly --time=03:00

# Monthly backups with 90-day retention
node scripts/schedule-postgres-backups.js --schedule=monthly --retention=90

# Test backup immediately
node scripts/schedule-postgres-backups.js --test

# Backup with encryption
node scripts/schedule-postgres-backups.js --encrypt
```

## Backup Formats

### Custom Format (Recommended)
- **Extension**: `.dump`
- **Pros**: Compressed, selective restore, parallel restore
- **Cons**: Not human-readable
- **Use Case**: Production backups

```bash
# Create custom format backup
pg_dump -Fc -f backup.dump database_name
```

### Plain SQL Format
- **Extension**: `.sql`
- **Pros**: Human-readable, portable, easy to edit
- **Cons**: Larger size, slower restore
- **Use Case**: Development, debugging

```bash
# Create plain SQL backup
pg_dump -Fp -f backup.sql database_name
```

### Tar Format
- **Extension**: `.tar`
- **Pros**: Compressed, selective restore
- **Cons**: Slower than custom format
- **Use Case**: Archive storage

```bash
# Create tar format backup
pg_dump -Ft -f backup.tar database_name
```

### Directory Format
- **Extension**: `.dir`
- **Pros**: Parallel backup/restore, selective restore
- **Cons**: Multiple files
- **Use Case**: Large databases

```bash
# Create directory format backup
pg_dump -Fd -f backup.dir database_name
```

## Backup Options

### Include/Exclude Options

```javascript
// Schema only (no data)
await postgresBackupService.performDatabaseBackup(backup, dir, timestamp, {
  includeData: false,
  includeSchema: true
});

// Data only (no schema)
await postgresBackupService.performDatabaseBackup(backup, dir, timestamp, {
  includeData: true,
  includeSchema: false
});

// Full backup (schema + data)
await postgresBackupService.performDatabaseBackup(backup, dir, timestamp, {
  includeData: true,
  includeSchema: true
});
```

### Compression

All backups are automatically compressed using gzip (level 6):
- Typical compression ratio: 5-10x
- Balance between speed and size
- Transparent decompression on restore

### Encryption

Enable encryption for sensitive data:

```javascript
const backup = {
  settings: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-cbc',
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY // 64-char hex string
    }
  }
};
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Restore Procedures

### Standard Restore

```bash
# 1. Stop application
pm2 stop hr-sm

# 2. Restore database
node scripts/restore-postgres-backup.js backups/database-main_app-2026-04-06.dump.gz

# 3. Verify restoration
psql -d hrsm_main_app -c "SELECT COUNT(*) FROM users;"

# 4. Start application
pm2 start hr-sm
```

### Restore with Drop Existing

```bash
# This will drop all existing objects before restore
node scripts/restore-postgres-backup.js backups/database-main_app-2026-04-06.dump.gz --drop-existing
```

### Selective Restore

```bash
# Restore specific tables only
pg_restore -d hrsm_main_app -t users -t departments backup.dump

# Restore specific schema only
pg_restore -d hrsm_main_app -n public backup.dump
```

### Point-in-Time Recovery

For point-in-time recovery, you need:
1. Base backup
2. WAL (Write-Ahead Log) archives

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'

# Restore to specific point in time
pg_restore -d hrsm_main_app backup.dump
# Then apply WAL files up to desired point
```

## Backup Scheduling

### Using Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM
0 2 * * * cd /path/to/hr-sm && node scripts/schedule-postgres-backups.js --test

# Add weekly backup on Sunday at 3:00 AM
0 3 * * 0 cd /path/to/hr-sm && node scripts/schedule-postgres-backups.js --schedule=weekly --test
```

### Using Task Scheduler (Windows)

```powershell
# Create scheduled task
$action = New-ScheduledTaskAction -Execute "node" -Argument "scripts/schedule-postgres-backups.js --test" -WorkingDirectory "C:\path\to\hr-sm"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "PostgreSQL Backup" -Description "Daily PostgreSQL backup"
```

### Using PM2 (Node.js Process Manager)

```bash
# Start backup scheduler as PM2 process
pm2 start scripts/schedule-postgres-backups.js --name "postgres-backup-scheduler"

# View logs
pm2 logs postgres-backup-scheduler

# Stop scheduler
pm2 stop postgres-backup-scheduler
```

## Backup Retention

### Automatic Cleanup

The backup service automatically cleans up old backups based on retention policy:

```javascript
// Clean up backups older than 30 days
await postgresBackupService.cleanupOldBackups('./backups', 30);
```

### Retention Strategies

**Daily Backups**
- Keep: 7 days
- Storage: ~7 backups

**Weekly Backups**
- Keep: 4 weeks (28 days)
- Storage: ~4 backups

**Monthly Backups**
- Keep: 12 months (365 days)
- Storage: ~12 backups

**Combined Strategy**
- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months
- Total: ~23 backups

## Backup Verification

### Checksum Verification

```javascript
// Verify backup integrity
const isValid = await postgresBackupService.verifyBackup(
  backupPath,
  expectedChecksum
);
```

### Test Restore

```bash
# 1. Create test database
createdb hrsm_test

# 2. Restore to test database
pg_restore -d hrsm_test backup.dump

# 3. Verify data
psql -d hrsm_test -c "SELECT COUNT(*) FROM users;"

# 4. Drop test database
dropdb hrsm_test
```

### Automated Verification

```bash
# Schedule weekly backup verification
0 4 * * 1 cd /path/to/hr-sm && node scripts/verify-backup.js
```

## Monitoring and Alerts

### Backup Monitoring

Monitor backup health:
- Backup completion status
- Backup file size
- Backup duration
- Disk space usage
- Failed backup count

### Alert Configuration

```javascript
// Send alert on backup failure
async function sendBackupAlert(subject, message) {
  // Email
  await sendEmail({
    to: 'admin@company.com',
    subject: `Backup Alert: ${subject}`,
    body: message
  });
  
  // Slack
  await sendSlackMessage({
    channel: '#alerts',
    text: `🚨 ${subject}: ${message}`
  });
  
  // SMS (Twilio)
  await sendSMS({
    to: '+1234567890',
    message: `Backup Alert: ${subject}`
  });
}
```

## Troubleshooting

### Issue: pg_dump not found

**Solution**:
```bash
# Add PostgreSQL bin to PATH
export PATH="/usr/lib/postgresql/14/bin:$PATH"

# Or use full path
/usr/lib/postgresql/14/bin/pg_dump -Fc -f backup.dump database_name
```

### Issue: Permission denied

**Solution**:
```bash
# Ensure backup directory is writable
chmod 755 /path/to/backups

# Or run with sudo (not recommended)
sudo node scripts/backup-postgres.js
```

### Issue: Out of disk space

**Solution**:
```bash
# Check disk space
df -h

# Clean up old backups
node -e "
  import('./server/modules/hr-core/backup/services/postgresBackup.service.js')
    .then(m => m.default.cleanupOldBackups('./backups', 7))
"

# Or manually delete old backups
rm backups/database-*-2026-03-*.dump.gz
```

### Issue: Backup takes too long

**Solution**:
```bash
# Use parallel backup (directory format)
pg_dump -Fd -j 4 -f backup.dir database_name

# Or compress after backup
pg_dump -Fp database_name | gzip > backup.sql.gz
```

### Issue: Restore fails with errors

**Solution**:
```bash
# Check backup integrity
gunzip -t backup.dump.gz

# Restore with verbose output
pg_restore -v -d database_name backup.dump

# Restore with error tolerance
pg_restore --no-owner --no-acl -d database_name backup.dump
```

## Best Practices

### 1. Regular Backups
- Daily backups for production
- Weekly backups for staging
- Monthly backups for archives

### 2. Test Restores
- Test restore monthly
- Verify data integrity
- Document restore time

### 3. Multiple Backup Locations
- Local backups (fast restore)
- Remote backups (disaster recovery)
- Cloud backups (long-term storage)

### 4. Encryption
- Always encrypt production backups
- Store encryption keys securely
- Rotate encryption keys annually

### 5. Monitoring
- Monitor backup success/failure
- Track backup size trends
- Alert on backup failures

### 6. Documentation
- Document backup procedures
- Document restore procedures
- Keep runbooks updated

### 7. Retention Policy
- Define retention periods
- Automate cleanup
- Archive important backups

### 8. Disaster Recovery
- Test disaster recovery plan
- Document recovery procedures
- Maintain off-site backups

## Performance Optimization

### Parallel Backup

```bash
# Use multiple jobs for faster backup
pg_dump -Fd -j 4 -f backup.dir database_name
```

### Compression Level

```javascript
// Adjust compression level (1-9)
// Level 6 is default (good balance)
// Level 1 is fastest, Level 9 is smallest
const gzip = createGzip({ level: 6 });
```

### Exclude Large Tables

```bash
# Exclude specific tables
pg_dump --exclude-table=logs --exclude-table=audit_trail -Fc -f backup.dump database_name
```

### Incremental Backups

For very large databases, consider:
- WAL archiving for incremental backups
- Logical replication for continuous backup
- Snapshot-based backups (filesystem level)

## Security Considerations

### 1. Access Control
- Limit backup file permissions (600)
- Restrict backup directory access
- Use dedicated backup user

### 2. Encryption
- Encrypt backups at rest
- Encrypt backups in transit
- Secure encryption keys

### 3. Audit Trail
- Log all backup operations
- Log all restore operations
- Monitor backup access

### 4. Compliance
- Meet regulatory requirements
- Document backup procedures
- Maintain backup logs

## Migration from MongoDB Backups

### Differences

| Feature | MongoDB | PostgreSQL |
|---------|---------|------------|
| Tool | mongodump | pg_dump |
| Format | BSON | Custom/SQL |
| Compression | Built-in | External (gzip) |
| Encryption | Manual | Manual |
| Restore | mongorestore | pg_restore |

### Migration Steps

1. **Stop MongoDB backups**
   ```bash
   # Disable MongoDB backup cron jobs
   crontab -e
   # Comment out MongoDB backup lines
   ```

2. **Enable PostgreSQL backups**
   ```bash
   # Start PostgreSQL backup scheduler
   pm2 start scripts/schedule-postgres-backups.js
   ```

3. **Update backup scripts**
   - Replace mongooseBackup.service.js references
   - Update backup paths
   - Update restore procedures

4. **Test PostgreSQL backups**
   ```bash
   # Run test backup
   node scripts/schedule-postgres-backups.js --test
   
   # Test restore
   node scripts/restore-postgres-backup.js <backup-file> --verify
   ```

5. **Archive MongoDB backups**
   ```bash
   # Move MongoDB backups to archive
   mv backups/mongodb backups/archive/mongodb-$(date +%Y%m%d)
   ```

## Summary

PostgreSQL backup and restore procedures provide:
- ✅ Reliable backups using pg_dump
- ✅ Multiple backup formats
- ✅ Compression and encryption
- ✅ Automated scheduling
- ✅ Flexible restore options
- ✅ Backup verification
- ✅ Retention policies
- ✅ Monitoring and alerts

**Next Steps**:
1. Set up automated backups
2. Test restore procedures
3. Configure monitoring
4. Document custom procedures
5. Train team on backup/restore

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Status**: Production Ready
