# Module Security Fixes - Database Isolation

## Overview
This document tracks fixes applied to ensure proper database isolation in multi-tenant modules. The issue was that some modules were using the default mongoose connection instead of tenant-specific connections, causing data to be stored in the wrong database.

## Architecture
- **Cluster 1** (cluster.uwhj601.mongodb.net): Company-specific databases (e.g., `hrsm_techcorp_solutions`)
- **Cluster 2** (license-server.n0m3jbn.mongodb.net): Platform/licensing management (`hrsm-licenses`)
- **hrsm_admin**: Base URI for multi-tenant connections, doesn't store actual data

## Fixed Modules

### 1. Life Insurance Module - Insurance Providers
**Date Fixed**: January 27, 2026
**Issue**: Insurance providers created via UI were being stored in `hrsm_admin` instead of company database
**Root Cause**: Controller used default mongoose connection instead of tenant-specific connection

**Solution**:
- Updated `insuranceProviderController.js` to use `multiTenantDB.getCompanyConnection(tenantId)`
- Created `getInsuranceProviderModel()` helper function
- Updated all 8 controller functions to use tenant-specific model
- Migrated existing providers from `hrsm_admin` to `hrsm_techcorp_solutions`

**Files Modified**:
- `server/modules/life-insurance/controllers/insuranceProviderController.js`

**Migration Script**:
- `move-providers-to-company-db.js`

### 2. Documents Module - Document Upload
**Date Fixed**: January 27, 2026
**Issue**: Documents uploaded via UI were not being saved to database, or were being saved to wrong database
**Root Cause**: DocumentService used DocumentRepository which relied on default mongoose connection

**Solution**:
- Completely refactored `DocumentService.js` to use tenant-specific connections
- Removed dependency on DocumentRepository (which uses BaseRepository with default connection)
- Created `getDocumentModel()` helper function that registers model on tenant-specific connection
- Updated all service methods to use tenant-specific model
- Added proper schema definition with all required fields (including mimeType, description)
- Registered User and Department models on tenant connection for populate to work

**Files Modified**:
- `server/modules/documents/services/DocumentService.js`
- `server/modules/documents/controllers/document.controller.js` (already had tenant-aware upload logic)

**Methods Updated**:
- getAllDocuments
- createDocument
- getDocumentById
- updateDocument
- deleteDocument
- getDocumentsByEmployee
- getDocumentsByCategory
- getDocumentsByType
- getDocumentsByDepartment
- searchDocuments
- getDocumentStatistics
- getExpiringDocuments
- markDocumentExpired
- bulkUpdateDocumentStatus
- getDocumentAccessLog
- logDocumentAccess
- getDocumentsRequiringApproval
- approveDocument

### 3. Documents Module - HardCopy Upload
**Date Fixed**: January 27, 2026
**Issue**: HardCopy uploads failed with "Cannot populate path 'uploadedBy'" error
**Root Cause**: HardCopy controller used default HardCopy model instead of tenant-specific connection

**Solution**:
- Created `getHardCopyModel()` helper function in hardcopy controller
- Registers HardCopy model on tenant-specific connection
- Registers User model on tenant connection for populate to work
- Updated all 6 controller functions to use tenant-specific model

**Files Modified**:
- `server/modules/documents/controllers/hardcopy.controller.js`

**Methods Updated**:
- getAllHardCopies
- createHardCopy
- getHardCopyById
- updateHardCopy
- uploadHardCopy
- deleteHardCopy

## Pattern to Follow

All multi-tenant modules MUST follow this pattern:

```javascript
import multiTenantDB from '../../../config/multiTenantDB.js';

// Helper function to get tenant-specific model
function getModelName(tenantId) {
  const connection = multiTenantDB.getCompanyConnection(tenantId);
  
  if (connection.models.ModelName) {
    return connection.models.ModelName;
  }

  // Define schema
  const schema = new mongoose.Schema({
    // ... schema definition
    tenantId: { type: String, required: true, index: true }
  });

  return connection.model('ModelName', schema);
}

// Use in controller/service
const Model = getModelName(tenantId);
const data = await Model.find({ tenantId });
```

## Verification Steps

For each fixed module:
1. Create new record via UI
2. Check company database (e.g., `hrsm_techcorp_solutions`) for the record
3. Verify `tenantId` field is set correctly
4. Confirm record does NOT appear in `hrsm_admin`
5. Test all CRUD operations (Create, Read, Update, Delete)

## Modules to Review

Other modules that may need similar fixes:
- [ ] Announcements
- [ ] Surveys
- [ ] Performance Reviews
- [ ] Training
- [ ] Recruitment
- [ ] Payroll
- [ ] Time Tracking
- [ ] Leave Management
- [ ] Assets
- [ ] Expenses

## Notes

- The `hrsm_admin` database should only contain:
  - TenantConfig records
  - Platform-level configuration
  - NOT company-specific operational data

- All company data (employees, documents, insurance providers, etc.) should be in company-specific databases like `hrsm_techcorp_solutions`

- Always use `multiTenantDB.getCompanyConnection(tenantId)` for company data
- Never use default mongoose connection for tenant-specific data
