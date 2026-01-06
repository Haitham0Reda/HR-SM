# ⚠️ DEPRECATED: Global Models Directory

This directory has been **deprecated** as part of the migration to a fully tenant-isolated architecture.

## What Changed

All models have been converted from global to tenant-specific and moved to their appropriate module locations:

### Moved Models

| Old Location | New Location | Type |
|-------------|--------------|------|
| `server/models/BackupLog.js` | `server/modules/system/models/backupLog.model.js` | Tenant-Specific |
| `server/models/DataArchive.js` | `server/modules/data-management/models/dataArchive.model.js` | Tenant-Specific |
| `server/models/DataRetentionPolicy.js` | `server/modules/data-management/models/dataRetentionPolicy.model.js` | Tenant-Specific |
| `server/models/performanceMetrics.model.js` | `server/modules/system/models/performanceMetrics.model.js` | Tenant-Specific |
| `server/models/securityEvents.model.js` | `server/modules/system/models/securityEvents.model.js` | Tenant-Specific |
| `server/models/systemAlerts.model.js` | `server/modules/system/models/systemAlerts.model.js` | Tenant-Specific |
| `server/models/CompanyLicense.js` | `server/modules/licensing/models/companyLicense.model.js` | Tenant-Specific |

## Key Changes Made

### 1. **Tenant Isolation**
- All models now require `tenantId` field
- Compound indexes include `tenantId` as the first field
- Automatic tenant filtering in queries

### 2. **Database Architecture**
- Each tenant gets its own MongoDB database (`hrsm_{company_name}`)
- Models are registered per tenant connection
- No more global model instances

### 3. **Updated Method Signatures**
Static methods now require `tenantId` parameter:

```javascript
// OLD (Global)
BackupLog.getStatistics(startDate, endDate)
BackupLog.findExpiredBackups()
BackupLog.getRecentBackups(limit)

// NEW (Tenant-Specific)
BackupLog.getStatistics(tenantId, startDate, endDate)
BackupLog.findExpiredBackups(tenantId)
BackupLog.getRecentBackups(tenantId, limit)
```

## Migration Guide

### For Controllers/Services
Update your imports and method calls:

```javascript
// OLD
import BackupLog from '../models/BackupLog.js';
const stats = await BackupLog.getStatistics();

// NEW
import { getModelForConnection } from '../config/sharedModels.js';
const BackupLog = getModelForConnection(connection, 'BackupLog');
const stats = await BackupLog.getStatistics(tenantId);
```

### For Multi-Tenant Queries
All queries are now automatically scoped to the tenant:

```javascript
// Automatic tenant filtering
const alerts = await SystemAlerts.find({ status: 'active' });
// Equivalent to: SystemAlerts.find({ tenantId: currentTenantId, status: 'active' })
```

## Benefits

✅ **Complete Tenant Isolation** - No risk of cross-tenant data access  
✅ **Better Performance** - Tenant-specific indexes and smaller datasets  
✅ **Scalability** - Each tenant can scale independently  
✅ **Compliance** - Meets data residency and isolation requirements  
✅ **Security** - Reduced attack surface for data breaches  

## Registry Integration

All models are registered in `server/config/sharedModels.js` and automatically available in tenant connections through the multi-tenant database system.

---

**This directory will be removed in a future release. Please update your imports to use the new module-based locations.**