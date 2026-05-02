# Remaining Model Conversions - Implementation Guide

## Completed So Far (22 models)

✅ User, Department, Position, Role, AttendanceDevice
✅ Attendance, Vacation, Request, Overtime, Mission
✅ Event, Announcement, Notification, Payroll, Survey
✅ ThemeConfig, Task, TaskReport, Salary, Holiday
✅ CompanyLicense
✅ EmailService, ClinicService, AttendanceDeviceService (services)

## Conversion Pattern Template

```javascript
// MONGOOSE PATTERN
import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    tenantId: { type: String, required: true, index: true },
    field: { type: String, required: true },
    ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
    nested: { subfield: String },
    array: [{ item: String }],
    enum: { type: String, enum: ['a', 'b'] }
}, { timestamps: true });

export default mongoose.model('ModelName', schema);

// SEQUELIZE PATTERN
import { DataTypes } from 'sequelize';
import { mainAppDb } from '../../../config/database.js';

const ModelName = mainAppDb.define('ModelName', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'tenant_id'
    },
    field: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    ref: {
        type: DataTypes.UUID,
        references: { model: 'models', key: 'id' }
    },
    nested: {
        type: DataTypes.JSONB,
        defaultValue: {}
    },
    array: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    enum: {
        type: DataTypes.ENUM('a', 'b'),
        allowNull: false
    }
}, {
    tableName: 'model_names',
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ['tenant_id'] }]
});

ModelName.associate = (models) => {
    ModelName.belongsTo(models.Model, { foreignKey: 'ref' });
};

export default ModelName;
```

## Data Type Mapping Reference

| Mongoose | Sequelize | Notes |
|----------|-----------|-------|
| `String` | `DataTypes.STRING(255)` or `TEXT` | Use TEXT for long content |
| `Number` | `DataTypes.INTEGER` or `DECIMAL` | Use DECIMAL for currency |
| `Boolean` | `DataTypes.BOOLEAN` | Direct mapping |
| `Date` | `DataTypes.DATE` | Stores with timezone |
| `ObjectId` | `DataTypes.UUID` | Primary/foreign keys |
| `Mixed/Object` | `DataTypes.JSONB` | For flexible schemas |
| `Array` | `DataTypes.JSONB` or `ARRAY` | JSONB for complex arrays |
| `enum` | `DataTypes.ENUM(...)` | Direct mapping |
| `Buffer` | `DataTypes.BLOB` | For binary data |

## Remaining Models by Priority

### HIGH PRIORITY (Business Critical)

#### Vacations Module (4 models)
1. **VacationBalance** - Complex model with nested objects, tenure calculations
   - Use JSONB for: annual, casual, sick, eligibility, flexibleHours, history
   - Instance methods: recalculate(), addHistory(), etc.
   - Static methods: initializeForEmployee(), calculateTenure()

2. **MixedVacation** - Mixed vacation types
   - Use JSONB for vacation details
   - Methods: detectOfficialHolidays(), calculateDeduction()

3. **SickLeave** - Sick leave tracking
   - Use JSONB for medical documentation
   - Foreign keys to User

4. **Vacation** - General vacation model (check for duplicate)

#### Surveys Module (1 model)
5. **SurveyNotification** - Survey notifications
   - Use JSONB for recipients array, message object, stats
   - Foreign keys: survey, createdBy

### MEDIUM PRIORITY (Feature Modules)

#### Life Insurance Module (5 models)
6. **InsurancePolicy** - Insurance policies
7. **InsuranceClaim** - Claims tracking
8. **FamilyMember** - Family member records
9. **Beneficiary** - Beneficiary information
10. **InsuranceProvider** - Provider details

#### Clinic Module (4 models)
11. **MedicalProfile** - Already partially converted
12. **Appointment** - Medical appointments
13. **Visit** - Visit records
14. **Prescription** - Prescription tracking

#### Documents Module (5 models)
15. **Document** - Document management
16. **DocumentTemplate** - Document templates
17. **Hardcopy** - Physical document tracking
18. **IDCard** - ID card records
19. **IDCardBatch** - Batch ID card generation

### LOWER PRIORITY (System & Reporting)

#### Reports Module (4 models)
20. **Report** - Report definitions
21. **ReportConfig** - Report configuration
22. **ReportExecution** - Execution tracking
23. **ReportExport** - Export records

#### System Module (4 models)
24. **BackupLog** - Backup operation logs
25. **PerformanceMetrics** - Performance tracking
26. **SecurityEvents** - Security event logs
27. **SystemAlerts** - System alerts

#### Other Modules (5 models)
28. **EmailLog** - Email tracking
29. **DashboardConfig** - Dashboard settings
30. **DataArchive** - Archived data
31. **DataRetentionPolicy** - Retention policies
32. **AuditLog** - Audit trail
33. **TenantConfig** - Tenant configuration

## Implementation Steps for Each Model

1. **Read the Mongoose model** - Understand structure, methods, hooks
2. **Create Sequelize model** - Define schema with proper data types
3. **Map data types** - Use reference table above
4. **Convert nested objects** - Use JSONB for complex structures
5. **Define indexes** - Include tenant_id in all indexes
6. **Add associations** - Define belongsTo, hasMany relationships
7. **Convert methods** - Instance and static methods
8. **Convert hooks** - beforeSave → beforeCreate/beforeUpdate
9. **Test the model** - Ensure it works with existing services

## Key Considerations

### Multi-Tenancy
- ALL models must have `tenant_id` column
- ALL indexes should include `tenant_id`
- ALL queries must filter by `tenant_id`

### Complex Nested Data
- Use JSONB for:
  - Arrays of objects
  - Flexible schemas
  - Nested configurations
  - Historical data

### Associations
- Define in `associate()` method
- Use proper foreign key names
- Consider cascade options

### Methods
- Static methods → Model.methodName
- Instance methods → Model.prototype.methodName
- Virtual fields → Use getters or instance methods

### Hooks
- beforeSave → beforeCreate + beforeUpdate
- pre('save') → hooks.beforeSave
- post('save') → hooks.afterSave

## Status Summary

- **Total Models**: ~55
- **Completed**: 22 (40%)
- **Remaining**: 33 (60%)
- **High Priority**: 5 models
- **Medium Priority**: 14 models
- **Lower Priority**: 14 models

## Next Steps

1. Complete HIGH PRIORITY models (Vacations, Surveys)
2. Convert MEDIUM PRIORITY models (Life Insurance, Clinic, Documents)
3. Convert LOWER PRIORITY models (Reports, System, Other)
4. Update all services to use new models
5. Test each module thoroughly
6. Remove Mongoose dependencies

## Estimated Effort

- High Priority: 4-6 hours
- Medium Priority: 8-12 hours
- Lower Priority: 6-8 hours
- **Total**: 18-26 hours for complete conversion

## Recommendation

Given the scope, consider:
1. **Phased approach**: Convert and test one module at a time
2. **Parallel work**: Multiple developers can work on different modules
3. **Automated testing**: Create tests for each converted model
4. **Gradual rollout**: Deploy module by module to production
