# Critical Services Conversion to Sequelize/PostgreSQL

## Status: IN PROGRESS

Converting 7 critical service files from Mongoose to Sequelize:

1. ⏳ server/services/alertSystem.service.js
2. ⏳ server/services/complianceReportingService.js  
3. ⏳ server/services/dataRetentionService.js
4. ⏳ server/services/licenseComplianceService.js
5. ⏳ server/services/performanceMonitoring.service.js
6. ⏳ server/services/securityEventTracking.service.js
7. ⏳ hrsm-license-server/src/services/auditService.js

## Conversion Approach

### Key Changes:
- Remove Mongoose schema definitions
- Import existing Sequelize models
- Convert Mongoose queries to Sequelize syntax
- Replace aggregation pipelines with Sequelize queries or raw SQL
- Update model methods to use Sequelize patterns

### Models Needed:
- SystemAlert (needs creation)
- SecurityEvent (needs creation)  
- SystemMetrics (needs creation)
- PerformanceAlert (needs creation)
- User (already exists)
- Tenant (already exists)
- License (already exists)
- LicenseAudit (already exists)

## Progress:
Starting conversion...
