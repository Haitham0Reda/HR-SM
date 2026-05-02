# License Server Models - Mongoose to Sequelize Conversion ✅

## Summary

Successfully converted the 3 remaining Mongoose models in the License Server to Sequelize! These were the last Mongoose models in the entire codebase.

## Converted Models (3)

### 1. License.js → License.sequelize.js ✅
**Location**: `hrsm-license-server/src/models/License.sequelize.js`

**Features Converted**:
- License identification (licenseId, licenseNumber with validation)
- Company information (companyId, companyName, companyDomain)
- License details (type, status with enums)
- Validity period (issuedAt, expiresAt)
- License limits (JSONB with validation)
- Enabled modules (JSONB array)
- Security & encryption (encryptionKey, signature, machineFingerprint)
- Usage tracking (JSONB with nested structure)
- Validation & sync tracking
- Audit trail (createdBy, updatedBy)
- Metadata (JSONB with nested objects)

**Instance Methods**:
- `generateSignature()` - Creates HMAC signature
- `verifySignature()` - Validates signature
- `isValid()` - Checks if license is valid
- `isExpired()` - Checks expiration
- `daysUntilExpiry()` - Calculates days remaining
- `generateEncryptedPayload()` - Creates encrypted license payload
- `updateUsage()` - Updates usage statistics
- `checkLimits()` - Validates usage against limits

**Static Methods**:
- `findByCompany()` - Find active license for company
- `findExpiring()` - Find licenses expiring soon
- `findExpired()` - Find expired licenses

**Hooks**:
- `beforeValidate` - Auto-generate license number and encryption key
- `beforeSave` - Update signature

**Indexes**: 8 indexes for performance

### 2. Tenant.js → Tenant.sequelize.js ✅
**Location**: `hrsm-license-server/src/models/Tenant.sequelize.js`

**Features Converted**:
- Tenant identification (tenantId, name, domain)
- Contact information (email, phone)
- Subscription information (JSONB with status, plan, dates, billing)
- Enabled modules (array of strings)
- Usage limits (JSONB)
- Billing information (JSONB)
- Metadata (JSONB with industry, size, country, timezone)
- Status tracking
- Soft delete support

**Instance Methods**:
- `isActive()` - Check if tenant is active
- `isExpired()` - Check if subscription expired
- `daysUntilExpiry()` - Calculate days until expiration
- `hasModule()` - Check if module is enabled
- `enableModule()` - Enable a module
- `disableModule()` - Disable a module
- `softDelete()` - Soft delete tenant

**Static Methods**:
- `findByTenantId()` - Find tenant by ID (excluding deleted)
- `findActive()` - Find all active tenants
- `findExpiring()` - Find tenants with expiring subscriptions

**Indexes**: 4 indexes for performance

### 3. LicenseAudit.js → LicenseAudit.sequelize.js ✅
**Location**: `hrsm-license-server/src/models/LicenseAudit.sequelize.js`

**Features Converted**:
- Audit identification (auditId with auto-generation)
- License reference (licenseId, licenseNumber, companyId)
- Event information (16 event types enum)
- Event details (description, previous/new state)
- Actor information (JSONB with user details, source, IP, user agent)
- Technical details (JSONB with request info, errors, timing)
- Validation results (JSONB with signature, limits, violations)
- Sync information (JSONB with sync status, errors, retries)
- Risk & compliance (risk level enum, compliance flags)
- Metadata (JSONB with environment, version, region)
- Retention policy (JSONB with retention date, archive info)

**Instance Methods**:
- `calculateRiskLevel()` - Auto-determine risk based on event type
- `shouldAlert()` - Check if event requires alerting
- `getEventSummary()` - Get formatted event summary

**Static Methods**:
- `findByLicense()` - Get audit trail for license
- `findByCompany()` - Get audit trail for company
- `findHighRiskEvents()` - Find high/critical risk events
- `getEventStatistics()` - Get aggregated event statistics
- `createAuditEntry()` - Create new audit entry
- `logLicenseValidation()` - Log validation event
- `logUsageUpdate()` - Log usage update event
- `logSyncAttempt()` - Log sync attempt event

**Hooks**:
- `beforeValidate` - Set retention policy and calculate risk level

**Indexes**: 6 indexes for performance

## Key Conversion Patterns

### 1. Mongoose Schema → Sequelize Model
```javascript
// Mongoose (Old)
const schema = new mongoose.Schema({...});
const Model = mongoose.model('Model', schema);

// Sequelize (New)
class Model extends Model {}
Model.init({...}, { sequelize, ... });
```

### 2. ObjectId → UUID
```javascript
// Mongoose (Old)
_id: mongoose.Schema.Types.ObjectId

// Sequelize (New)
id: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true
}
```

### 3. Nested Objects → JSONB
```javascript
// Mongoose (Old)
limits: {
  maxUsers: { type: Number, required: true },
  maxStorage: { type: Number, required: true }
}

// Sequelize (New)
limits: {
  type: DataTypes.JSONB,
  allowNull: false,
  defaultValue: { maxUsers: 1, maxStorage: 0 }
}
```

### 4. Arrays → JSONB or ARRAY
```javascript
// Mongoose (Old) - Array of objects
modules: [{ moduleId: String, enabled: Boolean }]

// Sequelize (New)
modules: {
  type: DataTypes.JSONB,
  defaultValue: []
}

// Mongoose (Old) - Array of strings
enabledModules: [{ type: String }]

// Sequelize (New)
enabledModules: {
  type: DataTypes.ARRAY(DataTypes.STRING),
  defaultValue: []
}
```

### 5. Enums
```javascript
// Mongoose (Old)
status: {
  type: String,
  enum: ['active', 'expired', 'suspended']
}

// Sequelize (New)
status: {
  type: DataTypes.ENUM('active', 'expired', 'suspended'),
  defaultValue: 'active'
}
```

### 6. Pre-save Hooks
```javascript
// Mongoose (Old)
schema.pre('save', function(next) {
  this.signature = generateSignature();
  next();
});

// Sequelize (New)
hooks: {
  beforeSave: (instance) => {
    instance.signature = instance.generateSignature();
  }
}
```

### 7. Query Methods
```javascript
// Mongoose (Old)
Model.find({ status: 'active' })
Model.findOne({ _id: id })

// Sequelize (New)
Model.findAll({ where: { status: 'active' } })
Model.findByPk(id)
```

### 8. JSONB Updates
```javascript
// Important: Must call changed() after updating JSONB fields
this.currentUsage = { ...this.currentUsage, ...updates };
this.changed('currentUsage', true);
await this.save();
```

## Database Configuration

The License Server already has Sequelize configuration:
- **File**: `hrsm-license-server/config/database.js`
- **Database**: `hrsm_licenses` (PostgreSQL)
- **Connection**: Already configured with pool settings
- **Export**: `licenseServerDb` instance

## Next Steps

### 1. Update Model Imports
Replace Mongoose model imports with Sequelize models in:
- Controllers (`hrsm-license-server/src/controllers/`)
- Services (`hrsm-license-server/src/services/`)
- Tests (`hrsm-license-server/src/__tests__/`)

### 2. Update Controllers
Files to update:
- `LicenseController.js`
- `TenantController.js`
- Any other controllers using these models

### 3. Update Services
Files to update:
- `licenseGenerator.js`
- `validationService.js`
- `auditService.js`
- Any other services using these models

### 4. Run Migrations
Create and run Sequelize migrations to:
- Create tables with proper schema
- Migrate data from MongoDB (if needed)
- Set up indexes

### 5. Update Tests
Update all test files to use Sequelize models and syntax

### 6. Remove Mongoose
Once all files are updated:
```bash
cd hrsm-license-server
npm uninstall mongoose
```

## Migration Status

### License Server ✅
- ✅ Database configuration (already Sequelize)
- ✅ License model converted
- ✅ Tenant model converted
- ✅ LicenseAudit model converted
- ⏳ Controllers need updating
- ⏳ Services need updating
- ⏳ Tests need updating

### Main Server ✅
- ✅ All 40+ models converted to Sequelize
- ⏳ 6 controllers need updating (use mongoose for multi-tenant)
- ⏳ Services need updating
- ⏳ Repositories need updating
- ⏳ Main database connection needs updating

## Important Notes

1. **JSONB Fields**: Always call `this.changed('fieldName', true)` after updating JSONB fields
2. **Validation**: Sequelize validation is synchronous, unlike Mongoose
3. **Hooks**: Use `beforeValidate`, `beforeSave`, etc. instead of Mongoose pre/post hooks
4. **Queries**: Use `where` clauses instead of Mongoose query objects
5. **Populate**: Use `include` instead of `populate()`
6. **Transactions**: Sequelize has better transaction support than Mongoose

## Testing Checklist

- [ ] Test license creation
- [ ] Test license validation
- [ ] Test signature generation and verification
- [ ] Test usage tracking and limit checking
- [ ] Test tenant management
- [ ] Test audit logging
- [ ] Test all static methods
- [ ] Test all instance methods
- [ ] Test hooks (beforeValidate, beforeSave)
- [ ] Test indexes are created
- [ ] Test JSONB field updates
- [ ] Test enum validations
- [ ] Test date calculations
- [ ] Test encryption/decryption

## Estimated Remaining Work

- Controllers: 2-3 hours
- Services: 2-3 hours
- Tests: 3-4 hours
- Migration scripts: 2-3 hours
- Testing & debugging: 3-4 hours

**Total**: 12-17 hours

## Conclusion

All Mongoose models in the License Server have been successfully converted to Sequelize! The models maintain full feature parity with the original Mongoose versions, including:
- All instance and static methods
- All hooks and middleware
- All validations
- All indexes
- Complex JSONB structures
- Encryption and security features

The next step is to update the controllers and services to use these new Sequelize models.
