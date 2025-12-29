# HR-SM Modernization Rollback Procedures

## Overview

This document provides detailed rollback procedures for the HR-SM modernization initiative. The procedures are organized by component and severity level to enable quick decision-making during deployment issues.

## Rollback Decision Matrix

| Issue Severity | Time to Decide | Rollback Scope | Decision Maker |
|---------------|----------------|----------------|----------------|
| Critical (System Down) | 5 minutes | Full rollback | Tech Lead |
| High (Major Features Broken) | 15 minutes | Component rollback | Tech Lead + Product Manager |
| Medium (Minor Issues) | 30 minutes | Targeted fix or rollback | Development Team |
| Low (Cosmetic Issues) | Next business day | Fix forward | Development Team |

## Component-Specific Rollback Procedures

### 1. Frontend Applications Rollback

#### HR Application Rollback
```bash
# 1. Revert to previous build
cd client/
git checkout [PREVIOUS_COMMIT_HASH]
npm run build

# 2. Deploy previous version
npm run deploy:production

# 3. Clear CDN cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/[ZONE_ID]/purge_cache" \
  -H "Authorization: Bearer [API_TOKEN]" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# 4. Verify rollback
curl -I https://hr-app.yourdomain.com
```

#### Platform Admin Rollback
```bash
# 1. Revert to previous build
cd client/platform-admin/
git checkout [PREVIOUS_COMMIT_HASH]
npm run build

# 2. Deploy previous version
npm run deploy:production

# 3. Verify rollback
curl -I https://admin.yourdomain.com
```

**Verification Steps:**
- [ ] Login functionality working
- [ ] Redux store not throwing errors
- [ ] Context API working (if rolled back)
- [ ] All critical pages loading
- [ ] No console errors

### 2. Backend Application Rollback

#### Main Backend Rollback
```bash
# 1. Stop current services
pm2 stop hr-sm-backend

# 2. Revert code
git checkout [PREVIOUS_COMMIT_HASH]
npm install

# 3. Revert environment configuration
cp .env.backup .env

# 4. Restart services
pm2 start ecosystem.config.js

# 5. Verify health
curl http://localhost:3000/health
```

**Repository Pattern Rollback:**
If repository pattern is causing issues, revert services to direct model access:

```bash
# 1. Checkout pre-repository commit
git checkout [PRE_REPOSITORY_COMMIT]

# 2. Remove repository dependencies
npm uninstall

# 3. Restore original service files
git checkout HEAD -- server/modules/*/services/

# 4. Restart services
pm2 restart hr-sm-backend
```

**Verification Steps:**
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] Authentication working
- [ ] Multi-tenant isolation working
- [ ] No memory leaks

### 3. License Server Rollback

#### Independent License Server Rollback
```bash
# 1. Stop license server
pm2 stop hrsm-license-server

# 2. Revert to integrated license validation
cd server/
git checkout [PRE_MICROSERVICE_COMMIT]

# 3. Update backend configuration
# Remove license server middleware
# Restore integrated license validation

# 4. Restart main backend
pm2 restart hr-sm-backend
```

#### Partial License Server Rollback
If license server is working but integration is failing:

```bash
# 1. Disable license server middleware
# Comment out license validation middleware in app.js

# 2. Enable bypass mode
export LICENSE_VALIDATION_BYPASS=true

# 3. Restart backend
pm2 restart hr-sm-backend
```

**Verification Steps:**
- [ ] License validation working (integrated or bypassed)
- [ ] Platform admin license management disabled/hidden
- [ ] No license server connection errors
- [ ] Tenant access working normally

### 4. Database Rollback

#### MongoDB Rollback (Use with extreme caution)
```bash
# 1. Stop all application services
pm2 stop all

# 2. Create current state backup
mongodump --host localhost:27017 --db hrms --out /backups/emergency-$(date +%Y%m%d-%H%M%S)

# 3. Restore from pre-deployment backup
mongorestore --host localhost:27017 --db hrms --drop /backups/pre-deployment-backup/

# 4. Verify data integrity
mongo hrms --eval "db.users.count()"
mongo hrms --eval "db.companies.count()"

# 5. Restart services with previous version
pm2 start ecosystem.config.js
```

**Repository Schema Rollback:**
If repository pattern introduced schema changes:

```bash
# 1. Run reverse migrations
node scripts/reverse-repository-migrations.js

# 2. Verify schema compatibility
node scripts/verify-schema.js

# 3. Test with previous application version
```

## Rollback Scenarios & Procedures

### Scenario 1: Redux Store Causing Frontend Crashes

**Symptoms:**
- White screen of death
- Console errors about Redux
- State persistence issues

**Rollback Steps:**
1. **Immediate (5 minutes):**
   ```bash
   # Deploy previous frontend build
   cd client/
   git checkout [PRE_REDUX_COMMIT]
   npm run build && npm run deploy:production
   ```

2. **Verification:**
   - [ ] Applications loading without errors
   - [ ] Context API working
   - [ ] User authentication functional

3. **Communication:**
   - Notify users that Redux features are temporarily unavailable
   - Update status page

### Scenario 2: Repository Pattern Causing Database Issues

**Symptoms:**
- Slow database queries
- Data inconsistency
- Transaction failures

**Rollback Steps:**
1. **Immediate (10 minutes):**
   ```bash
   # Revert to direct model access
   git checkout [PRE_REPOSITORY_COMMIT]
   pm2 restart hr-sm-backend
   ```

2. **Database Verification:**
   ```bash
   # Check for data corruption
   node scripts/verify-data-integrity.js
   
   # If corruption found, restore from backup
   mongorestore --drop /backups/pre-repository-backup/
   ```

3. **Performance Check:**
   - [ ] API response times normal
   - [ ] Database query performance acceptable
   - [ ] No memory leaks

### Scenario 3: License Server Integration Failures

**Symptoms:**
- License validation errors
- Tenant access denied
- License server connection timeouts

**Rollback Steps:**
1. **Quick Fix (5 minutes):**
   ```bash
   # Enable bypass mode
   export LICENSE_VALIDATION_BYPASS=true
   pm2 restart hr-sm-backend
   ```

2. **Full Rollback (15 minutes):**
   ```bash
   # Revert to integrated license validation
   git checkout [PRE_MICROSERVICE_COMMIT]
   pm2 stop hrsm-license-server
   pm2 restart hr-sm-backend
   ```

3. **Verification:**
   - [ ] All tenants can access their data
   - [ ] License checks working (integrated mode)
   - [ ] Platform admin license UI disabled

### Scenario 4: E2E Test Failures in Production

**Symptoms:**
- Critical workflows not working
- Multi-tenant isolation broken
- Authentication failures

**Rollback Steps:**
1. **Assessment (5 minutes):**
   - Run critical path smoke tests
   - Identify which component is failing

2. **Targeted Rollback (10-15 minutes):**
   - Rollback only the failing component
   - Keep working components deployed

3. **Full System Rollback (30 minutes):**
   - If multiple components affected
   - Revert entire system to previous stable state

## Rollback Testing Procedures

### Pre-Rollback Testing
Before executing rollback:
1. [ ] Backup current state
2. [ ] Document current issues
3. [ ] Identify rollback scope
4. [ ] Notify stakeholders

### Post-Rollback Testing
After rollback execution:
1. [ ] Verify system functionality
2. [ ] Check data integrity
3. [ ] Test critical workflows
4. [ ] Monitor system performance
5. [ ] Confirm issue resolution

## Communication During Rollback

### Internal Communication
```
Subject: [URGENT] HR-SM System Rollback in Progress

Team,

We are executing a rollback of the HR-SM modernization deployment due to [ISSUE_DESCRIPTION].

Rollback Scope: [COMPONENT/FULL_SYSTEM]
Expected Duration: [TIME_ESTIMATE]
Current Status: [IN_PROGRESS/COMPLETED]

Next Update: [TIME]

Technical Lead: [NAME]
```

### Customer Communication
```
Subject: HR-SM System Maintenance Update

Dear Customers,

We are performing emergency maintenance on the HR-SM system to resolve [BRIEF_DESCRIPTION].

Impact: [DESCRIBE_USER_IMPACT]
Expected Resolution: [TIME_ESTIMATE]
Workaround: [IF_AVAILABLE]

We apologize for any inconvenience and will provide updates every 30 minutes.

Support Team
```

## Post-Rollback Actions

### Immediate Actions (0-2 hours)
- [ ] Verify system stability
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Confirm user access restored
- [ ] Update status page

### Short-term Actions (2-24 hours)
- [ ] Conduct root cause analysis
- [ ] Document lessons learned
- [ ] Plan fix strategy
- [ ] Update rollback procedures
- [ ] Schedule team retrospective

### Long-term Actions (1-7 days)
- [ ] Implement permanent fixes
- [ ] Update testing procedures
- [ ] Improve deployment process
- [ ] Train team on new procedures
- [ ] Update documentation

## Rollback Prevention

### Pre-Deployment
- [ ] Comprehensive testing in staging
- [ ] Performance benchmarking
- [ ] Rollback plan review
- [ ] Team readiness check

### During Deployment
- [ ] Gradual rollout (if possible)
- [ ] Real-time monitoring
- [ ] Quick smoke tests
- [ ] Immediate issue escalation

### Monitoring & Alerting
- [ ] System health dashboards
- [ ] Automated error detection
- [ ] Performance threshold alerts
- [ ] User experience monitoring

## Emergency Contacts

### Rollback Decision Makers
- **Technical Lead**: [Contact] - Final technical decisions
- **Product Manager**: [Contact] - Business impact decisions
- **DevOps Lead**: [Contact] - Infrastructure decisions

### Execution Team
- **Backend Developer**: [Contact] - Backend rollback execution
- **Frontend Developer**: [Contact] - Frontend rollback execution
- **Database Administrator**: [Contact] - Database rollback execution
- **Infrastructure Engineer**: [Contact] - Server/deployment rollback

### Communication Team
- **Customer Success**: [Contact] - Customer communication
- **Support Manager**: [Contact] - Support team coordination
- **Marketing**: [Contact] - Public communication

## Rollback Checklist Template

```
Rollback Execution Checklist
Date: ___________
Issue: ___________
Decision Maker: ___________
Rollback Scope: ___________

Pre-Rollback:
[ ] Current state backed up
[ ] Rollback plan reviewed
[ ] Team notified
[ ] Customers notified (if needed)

Rollback Execution:
[ ] Component 1 rolled back
[ ] Component 2 rolled back
[ ] Component 3 rolled back
[ ] Services restarted

Post-Rollback Verification:
[ ] System functionality verified
[ ] Performance acceptable
[ ] Users can access system
[ ] No data loss confirmed

Communication:
[ ] Team updated
[ ] Customers notified
[ ] Status page updated
[ ] Incident documented

Lessons Learned:
[ ] Root cause identified
[ ] Prevention measures planned
[ ] Procedures updated
[ ] Team debriefed
```