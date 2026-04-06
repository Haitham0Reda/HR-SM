# Rollback Quick Reference Guide

## Emergency Rollback - Fast Track

**Use this guide when you need to rollback immediately.**

### Prerequisites Check (2 minutes)

```bash
# 1. Verify MongoDB backup exists
ls -lh /backup/mongodb/ | tail -5

# 2. Check MongoDB service
sudo systemctl status mongod

# 3. Verify you have the rollback plan
ls -la ROLLBACK_PLAN.md
```

### Fast Rollback Commands (60-90 minutes)

```bash
# STEP 1: Stop application (2 min)
pm2 stop hr-sm hrsm-license-server

# STEP 2: Update environment (3 min)
cp .env.mongodb.backup .env
# Or manually set:
export DATABASE_TYPE=mongodb
export USE_MONGODB=true

# STEP 3: Start MongoDB (2 min)
sudo systemctl start mongod
mongosh --eval "db.adminCommand('ping')"

# STEP 4: Restore license server (10 min)
mongorestore \
  --uri="mongodb://localhost:27017" \
  --nsInclude="hrsm-license-server.*" \
  /backup/mongodb/$(ls -t /backup/mongodb/ | head -1)/hrsm-license-server

# STEP 5: Restore tenant databases (30-60 min)
for tenant_db in /backup/mongodb/$(ls -t /backup/mongodb/ | head -1)/*/; do
  db_name=$(basename "$tenant_db")
  if [[ "$db_name" != "admin" && "$db_name" != "local" && "$db_name" != "config" ]]; then
    echo "Restoring $db_name..."
    mongorestore --uri="mongodb://localhost:27017" --nsInclude="${db_name}.*" "$tenant_db"
  fi
done

# STEP 6: Restore code (if needed) (10 min)
git checkout mongodb-backup-branch -- server/

# STEP 7: Install dependencies (5 min)
npm install mongoose mongodb

# STEP 8: Start application (2 min)
pm2 start hr-sm hrsm-license-server

# STEP 9: Verify (5 min)
curl http://localhost:5000/api/health
curl http://localhost:4000/api/health
```

### Verification Checklist

```bash
# Quick verification commands
mongosh hrsm-license-server --eval "db.licenses.countDocuments()"
mongosh hrsm-license-server --eval "db.tenants.countDocuments()"
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

## Rollback Decision Tree

```
Is the issue critical?
├─ YES → Proceed with rollback
│   ├─ Data corruption? → IMMEDIATE ROLLBACK
│   ├─ System unusable? → IMMEDIATE ROLLBACK
│   └─ Performance issues? → Evaluate severity
│       ├─ Severe (>5x slower) → ROLLBACK
│       └─ Moderate → Try optimization first
│
└─ NO → Try fixes first
    ├─ Configuration issue? → Adjust config
    ├─ Code bug? → Deploy hotfix
    └─ Performance? → Optimize queries
```

## Common Issues & Quick Fixes

### Issue: MongoDB won't start

```bash
# Check logs
sudo tail -100 /var/log/mongodb/mongod.log

# Check disk space
df -h

# Try manual start
sudo mongod --config /etc/mongod.conf
```

### Issue: mongorestore fails

```bash
# Try with --drop flag
mongorestore --drop --uri="mongodb://localhost:27017" /backup/mongodb/latest/

# Or restore without indexes first
mongorestore --noIndexRestore --uri="mongodb://localhost:27017" /backup/mongodb/latest/
```

### Issue: Application won't start

```bash
# Check environment
node -e "console.log(process.env.DATABASE_TYPE)"

# Test MongoDB connection
node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected'))
    .catch(err => console.error('Failed:', err));
"

# Check logs
tail -100 logs/application.log
```

### Issue: Missing data after restore

```bash
# List collections in backup
ls -la /backup/mongodb/latest/hrsm-license-server/

# Restore specific collection
mongorestore \
  --uri="mongodb://localhost:27017" \
  --nsInclude="hrsm-license-server.licenses" \
  /backup/mongodb/latest/
```

## Rollback Time Estimates

| Phase | Minimum | Maximum | Average |
|-------|---------|---------|---------|
| Stop Application | 2 min | 5 min | 3 min |
| Restore Config | 5 min | 15 min | 10 min |
| Restore Data | 30 min | 90 min | 60 min |
| Restore Code | 10 min | 20 min | 15 min |
| Verify | 5 min | 15 min | 10 min |
| Enable Traffic | 2 min | 5 min | 3 min |
| **TOTAL** | **54 min** | **150 min** | **101 min** |

**Note**: All estimates are within the 2-hour (120 minute) requirement.

## Emergency Contacts

| Role | Contact | Phone |
|------|---------|-------|
| Database Lead | database-lead@company.com | +1-XXX-XXX-XXXX |
| DevOps Lead | devops-lead@company.com | +1-XXX-XXX-XXXX |
| On-Call Engineer | oncall@company.com | +1-XXX-XXX-XXXX |

## Rollback Testing

```bash
# Test rollback procedures (dry run)
node scripts/test-rollback-procedures.js --dry-run

# Test specific phase
node scripts/test-rollback-procedures.js --phase=2 --dry-run

# Test without data restoration (faster)
node scripts/test-rollback-procedures.js --skip-data --dry-run

# Verbose output
node scripts/test-rollback-procedures.js --dry-run --verbose
```

## Post-Rollback Actions

1. **Notify stakeholders** - Send rollback completion notification
2. **Document incident** - Record what went wrong and why
3. **Analyze root cause** - Investigate PostgreSQL migration issues
4. **Plan next steps** - Determine if/when to retry migration
5. **Update documentation** - Record lessons learned

## Key Files & Locations

| Item | Location |
|------|----------|
| Rollback Plan | `ROLLBACK_PLAN.md` |
| MongoDB Backups | `/backup/mongodb/` |
| Environment Backup | `.env.mongodb.backup` |
| Code Backup (Git) | `mongodb-backup-branch` |
| Code Backup (Files) | `backup/code/` |
| Test Script | `scripts/test-rollback-procedures.js` |
| Logs | `logs/` |

## Success Criteria

Rollback is successful when:
- ✅ Application starts without errors
- ✅ MongoDB connections work
- ✅ Users can log in
- ✅ Data is accessible
- ✅ License validation works
- ✅ No critical errors in logs
- ✅ Performance is acceptable
- ✅ Completed within 2 hours

## Prevention Tips

1. **Keep MongoDB code** - Don't delete until PostgreSQL is proven stable
2. **Maintain backups** - Daily MongoDB backups during transition
3. **Test rollback** - Practice rollback in staging environment
4. **Document changes** - Track all configuration changes
5. **Monitor closely** - Watch for issues after migration
6. **Have team ready** - Ensure team is available during migration

## Additional Resources

- Full Rollback Plan: `ROLLBACK_PLAN.md`
- Migration Runbook: `MIGRATION_RUNBOOK.md`
- Backup Guide: `POSTGRES_BACKUP_RESTORE_GUIDE.md`
- Test Script: `scripts/test-rollback-procedures.js`

---

**Last Updated**: April 6, 2026  
**Version**: 1.0  
**Keep this guide accessible during migration!**
